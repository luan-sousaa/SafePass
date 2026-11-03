"""Rotas de medicamentos, lembretes, doses e vacinas — specs: prescription-api (FR-10 a FR-12), medicamentos-vacinas
e notificacoes-medicamentos."""

from datetime import date, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field, PositiveInt, StringConstraints

from api.deps import UsuarioAtual
from api.documentos import exigir_dependente
from repositories import documento_store, prescription_store, saude_store
from services.prescription.dose_schedule import horarios
from services.prescription.vigencia import ativo, duracao_dias

Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Hora = Annotated[str, StringConstraints(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")]  # "HH:MM"


class MedicamentoSalvoOut(BaseModel):
    id: Optional[int]  # só no manual; o da receita é editado pela receita
    ref: str  # "r{receita_id}-{indice}" ou "m{id}"
    origem: str  # "receita" | "manual"
    receita_id: Optional[int]
    medico: Optional[str]
    data_receita: Optional[str]
    medicamento: str
    dose: str
    posologia: str
    periodo: str
    horarios: list[str]
    primeira_dose: str
    dependente_id: Optional[int]
    inicio: str
    duracao_dias: Optional[int]
    encerrado_em: Optional[str]
    ativo: bool


class LembreteOut(BaseModel):
    tipo: str  # "medicamento" | "vacina"
    medicamento: str  # nome do medicamento ou da vacina
    dose: str
    periodo: str
    horario: Optional[str]  # "HH:MM"; nulo em vacina
    data: Optional[str]  # próxima dose da vacina; nulo em medicamento
    dependente_id: Optional[int]
    ref: Optional[str]  # nulo em vacina
    tomada: bool  # a dose de hoje neste horário já foi registrada
    ultimo_dia: bool  # hoje é o último dia do tratamento


class MedicamentoManualIn(BaseModel):
    medicamento: Texto
    dose: str = ""
    posologia: str = ""
    inicio: date = Field(default_factory=date.today)
    duracao_dias: Optional[PositiveInt] = None  # nulo = contínuo
    dependente_id: Optional[int] = None
    primeira_dose: Hora = "08:00"


# Campos sem Optional não aceitam null explícito: o PATCH só pode omiti-los.
class MedicamentoManualPatch(BaseModel):
    medicamento: Texto = None
    dose: str = None
    posologia: str = None
    inicio: date = None
    duracao_dias: Optional[PositiveInt] = None
    dependente_id: Optional[int] = None
    encerrado_em: Optional[date] = None  # encerrar = gravar a data; null reabre
    primeira_dose: Hora = None


class EncerramentoIn(BaseModel):
    encerrado_em: Optional[date]  # null reabre


class DoseIn(BaseModel):
    ref: str
    data: date  # dia do horário avisado, não o de agora (EC-4)
    horario: Hora


class VacinaIn(BaseModel):
    nome: Texto
    dose: str = ""  # ex.: "2ª dose", "reforço"
    data_aplicacao: date
    proxima_dose: Optional[date] = None
    dependente_id: Optional[int] = None
    documento_id: Optional[int] = None
    compartilhado_assistente: bool = False


class VacinaPatch(BaseModel):
    nome: Texto = None
    dose: str = None
    data_aplicacao: date = None
    proxima_dose: Optional[date] = None
    dependente_id: Optional[int] = None
    documento_id: Optional[int] = None
    compartilhado_assistente: bool = None


class VacinaOut(VacinaIn):
    id: int
    criado_em: str


def _inicio_da_receita(receita: dict) -> str:
    try:
        return date.fromisoformat(receita["data_receita"] or "").isoformat()
    except ValueError:  # sem data ou digitada fora do formato: vale o dia em que foi salva
        return receita["criado_em"][:10]


def medicamentos_das_receitas(receitas: list[dict]) -> list[dict]:
    medicamentos = []
    for r in receitas:
        for i, m in enumerate(r["medicamentos"]):
            inicio = m.get("inicio") or _inicio_da_receita(r)  # receita antiga não tem inicio nem primeira_dose (EC-3)
            primeira = m.get("primeira_dose") or "08:00"
            duracao, encerrado_em = duracao_dias(m["periodo"]), m.get("encerrado_em")
            medicamentos.append({
                "id": None, "ref": f"r{r['id']}-{i}", "origem": "receita", "receita_id": r["id"], "medico": r["medico"],
                "data_receita": r["data_receita"], **m, "horarios": horarios(m["posologia"], primeira), "primeira_dose": primeira,
                "dependente_id": r["dependente_id"], "inicio": inicio, "duracao_dias": duracao, "encerrado_em": encerrado_em,
                "ativo": ativo(inicio, duracao, encerrado_em),
            })
    return medicamentos


def _manual(m: dict) -> dict:
    primeira = m["primeira_dose"] or "08:00"  # medicamento salvo antes da coluna
    return {
        **m, "ref": f"m{m['id']}", "origem": "manual", "receita_id": None, "medico": None, "data_receita": None,
        "periodo": f"{m['duracao_dias']} dias" if m["duracao_dias"] else "", "primeira_dose": primeira,
        "horarios": horarios(m["posologia"], primeira), "ativo": ativo(m["inicio"], m["duracao_dias"], m["encerrado_em"]),
    }


def _ultimo_dia(m: dict) -> bool:
    return m["duracao_dias"] is not None and date.today() == date.fromisoformat(m["inicio"]) + timedelta(days=m["duracao_dias"] - 1)


def lembretes(medicamentos: list[dict], vacinas_pendentes: list[dict], tomadas: set[tuple[str, str]]) -> list[dict]:
    """Doses de hoje dos medicamentos ativos + próxima dose das vacinas (specs medicamentos-vacinas FR-5 e
    notificacoes-medicamentos FR-7). `tomadas`: (ref, horario) registrados hoje."""
    return [
        {"tipo": "medicamento", **m, "horario": h, "data": None, "tomada": (m["ref"], h) in tomadas, "ultimo_dia": _ultimo_dia(m)}
        for m in medicamentos if m["ativo"] for h in m["horarios"]
    ] + [
        {"tipo": "vacina", "medicamento": v["nome"], "dose": v["dose"], "periodo": "", "horario": None,
         "data": v["proxima_dose"], "dependente_id": v["dependente_id"], "ref": None, "tomada": False, "ultimo_dia": False}
        for v in sorted(vacinas_pendentes, key=lambda v: v["proxima_dose"])
    ]


def _exigir_documento(usuario_id: str, documento_id: Optional[int]) -> None:
    if documento_id is not None and documento_store.buscar_documento(usuario_id, documento_id) is None:
        raise HTTPException(404, "Documento não encontrado.")


router = APIRouter(prefix="/api")


@router.get("/medications", response_model=list[MedicamentoSalvoOut])
def list_medications(usuario_id: UsuarioAtual) -> list[dict]:
    todos = [_manual(m) for m in saude_store.listar_medicamentos(usuario_id)]
    todos += medicamentos_das_receitas(prescription_store.listar(usuario_id))
    return sorted(todos, key=lambda m: m["inicio"], reverse=True)  # estável: empate mantém a ordem de cada lista


@router.post("/medications", status_code=201, response_model=MedicamentoSalvoOut)
def create_medication(medicamento: MedicamentoManualIn, usuario_id: UsuarioAtual) -> dict:
    exigir_dependente(usuario_id, medicamento.dependente_id)
    return _manual(saude_store.criar_medicamento(usuario_id, medicamento.model_dump(mode="json")))


@router.patch("/medications/{medicamento_id}", response_model=MedicamentoSalvoOut)
def update_medication(medicamento_id: int, campos: MedicamentoManualPatch, usuario_id: UsuarioAtual) -> dict:
    enviados = campos.model_dump(mode="json", exclude_unset=True)
    exigir_dependente(usuario_id, enviados.get("dependente_id"))
    medicamento = saude_store.atualizar_medicamento(usuario_id, medicamento_id, enviados)
    if medicamento is None:
        raise HTTPException(404, "Medicamento não encontrado.")
    return _manual(medicamento)


@router.patch("/prescriptions/{receita_id}/medicamentos/{indice}", response_model=MedicamentoSalvoOut)
def finish_prescription_medication(receita_id: int, indice: int, campos: EncerramentoIn, usuario_id: UsuarioAtual) -> dict:
    encerrado_em = campos.encerrado_em.isoformat() if campos.encerrado_em else None
    if not prescription_store.encerrar_medicamento(usuario_id, receita_id, indice, encerrado_em):
        raise HTTPException(404, "Medicamento não encontrado nesta receita.")
    return next(m for m in list_medications(usuario_id) if m["ref"] == f"r{receita_id}-{indice}")


@router.get("/reminders", response_model=list[LembreteOut])
def list_reminders(usuario_id: UsuarioAtual) -> list[dict]:
    tomadas = saude_store.doses_tomadas(usuario_id, date.today().isoformat())
    return lembretes(list_medications(usuario_id), saude_store.listar_vacinas(usuario_id, pendentes=True), tomadas)


def _exigir_ref(usuario_id: str, ref: str) -> None:
    if ref not in {m["ref"] for m in list_medications(usuario_id)}:
        raise HTTPException(404, "Medicamento não encontrado.")


@router.post("/doses", status_code=201)
def take_dose(dose: DoseIn, usuario_id: UsuarioAtual) -> None:
    _exigir_ref(usuario_id, dose.ref)
    saude_store.registrar_dose(usuario_id, dose.ref, dose.data.isoformat(), dose.horario)


@router.delete("/doses", status_code=204)
def undo_dose(dose: DoseIn, usuario_id: UsuarioAtual) -> Response:
    _exigir_ref(usuario_id, dose.ref)
    saude_store.desfazer_dose(usuario_id, dose.ref, dose.data.isoformat(), dose.horario)
    return Response(status_code=204)


@router.get("/vacinas", response_model=list[VacinaOut])
def list_vaccines(usuario_id: UsuarioAtual, dependente_id: Optional[int] = None) -> list[dict]:
    return saude_store.listar_vacinas(usuario_id, dependente_id=dependente_id)


@router.post("/vacinas", status_code=201, response_model=VacinaOut)
def create_vaccine(vacina: VacinaIn, usuario_id: UsuarioAtual) -> dict:
    exigir_dependente(usuario_id, vacina.dependente_id)
    _exigir_documento(usuario_id, vacina.documento_id)
    return saude_store.criar_vacina(usuario_id, vacina.model_dump(mode="json"))


@router.get("/vacinas/{vacina_id}", response_model=VacinaOut)
def get_vaccine(vacina_id: int, usuario_id: UsuarioAtual) -> dict:
    vacina = saude_store.buscar_vacina(usuario_id, vacina_id)
    if vacina is None:
        raise HTTPException(404, "Vacina não encontrada.")
    return vacina


@router.patch("/vacinas/{vacina_id}", response_model=VacinaOut)
def update_vaccine(vacina_id: int, campos: VacinaPatch, usuario_id: UsuarioAtual) -> dict:
    enviados = campos.model_dump(mode="json", exclude_unset=True)
    exigir_dependente(usuario_id, enviados.get("dependente_id"))
    _exigir_documento(usuario_id, enviados.get("documento_id"))
    vacina = saude_store.atualizar_vacina(usuario_id, vacina_id, enviados)
    if vacina is None:
        raise HTTPException(404, "Vacina não encontrada.")
    return vacina


@router.delete("/vacinas/{vacina_id}", status_code=204)
def delete_vaccine(vacina_id: int, usuario_id: UsuarioAtual) -> None:
    if not saude_store.apagar_vacina(usuario_id, vacina_id):
        raise HTTPException(404, "Vacina não encontrada.")
