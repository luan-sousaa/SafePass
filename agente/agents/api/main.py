from datetime import date
from typing import Annotated, Optional

from fastapi import FastAPI, HTTPException, UploadFile
from pydantic import BaseModel, Field, StringConstraints

from api import documentos, saude
from api.deps import IMAGENS, MAX_UPLOAD_BYTES, UsuarioAtual, ler_arquivo  # noqa: F401 (MAX_UPLOAD_BYTES: testes)
from config.confidence_config import CONFIDENCE_THRESHOLD
from api.saude import Hora, LembreteOut, MedicamentoSalvoOut, VacinaOut
from repositories import documento_store, prescription_store, saude_store
from services.prescription.extraction_service import extract_prescription

class MedicamentoOut(BaseModel):
    medicamento: str
    dose: str
    posologia: str
    periodo: str
    precisa_revisar: bool


class ExtracaoOut(BaseModel):
    documento_ocr_id: int
    origem: str
    precisa_revisar: bool
    observacoes: Optional[str]
    medico: Optional[str]
    data_receita: Optional[str]
    medicamentos: list[MedicamentoOut]


class MedicamentoIn(BaseModel):
    medicamento: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    dose: str = ""
    posologia: str = ""
    periodo: str = ""
    inicio: Optional[date] = None  # nulo = o dia em que a receita é salva (spec notificacoes-medicamentos, FR-1)
    primeira_dose: Optional[Hora] = None  # nulo = 08:00


class ReceitaIn(BaseModel):
    documento_ocr_id: Optional[int] = None  # da extração; sem ele, é preenchimento manual
    dependente_id: Optional[int] = None  # dono da receita; nulo = o próprio usuário
    medico: Optional[str] = None
    data_receita: Optional[str] = None
    medicamentos: list[MedicamentoIn] = Field(min_length=1)


class ReceitaOut(ReceitaIn):
    id: int
    criado_em: str


class DocumentoContextoOut(BaseModel):
    id: int
    tipo: str
    titulo: str
    data_documento: Optional[str]
    dono: dict
    dados: Optional[dict]


class ContextoOut(BaseModel):
    documentos: list[DocumentoContextoOut]
    medicamentos: list[MedicamentoSalvoOut]
    lembretes: list[LembreteOut]
    vacinas: list[VacinaOut]


app = FastAPI(title="SAFEpass — API de extração de receitas")
app.include_router(documentos.router)
app.include_router(saude.router)


@app.post("/api/prescriptions/extract", response_model=ExtracaoOut)
def extract(file: UploadFile, usuario_id: UsuarioAtual) -> ExtracaoOut:
    # `def` (não async): o FastAPI roda em threadpool, e a chamada ao Gemini é bloqueante.
    image_bytes, mime_type = ler_arquivo(file, IMAGENS, "uma foto em JPG ou PNG")

    # A foto fica guardada: vira o arquivo do documento quando a receita for confirmada.
    arquivo = documento_store.guardar_arquivo(image_bytes, mime_type)
    documento_ocr_id = prescription_store.iniciar_documento(usuario_id, arquivo, mime_type, len(image_bytes))
    result = extract_prescription(image_bytes, mime_type=mime_type)
    prescription_store.concluir_extracao(
        documento_ocr_id,
        origem=result.origem,
        extraido=result.data.model_dump(),
        confianca=result.data.confianca_geral,
        campos_revisar=result.campos_revisar,
    )

    # O número de confiança é interno (spec prescription-extraction, FR-5): só sai o booleano.
    return ExtracaoOut(
        documento_ocr_id=documento_ocr_id,
        origem=result.origem,
        precisa_revisar=result.precisa_revisar,
        observacoes=result.data.observacoes,
        medico=result.data.medico,
        data_receita=result.data.data_receita,
        medicamentos=[
            {**item.model_dump(exclude={"confianca"}), "precisa_revisar": item.confianca < CONFIDENCE_THRESHOLD}
            for item in result.data.medicamentos
        ],
    )


@app.post("/api/prescriptions", status_code=201, response_model=ReceitaOut)
def save(receita: ReceitaIn, usuario_id: UsuarioAtual) -> dict:
    documentos.exigir_dependente(usuario_id, receita.dependente_id)
    dados = receita.model_dump(mode="json")
    for m in dados["medicamentos"]:  # grava os padrões: a receita antiga, sem eles, segue a regra antiga (EC-3)
        m["inicio"] = m["inicio"] or date.today().isoformat()
        m["primeira_dose"] = m["primeira_dose"] or "08:00"
    try:
        return prescription_store.salvar(dados, usuario_id)
    except prescription_store.DocumentoIndisponivel:
        raise HTTPException(409, "Esta leitura não está mais aguardando revisão. Envie a foto de novo.")


@app.get("/api/prescriptions", response_model=list[ReceitaOut])
def list_saved(usuario_id: UsuarioAtual) -> list[dict]:
    return prescription_store.listar(usuario_id)


@app.get("/api/assistente/contexto", response_model=ContextoOut)
def assistant_context(usuario_id: UsuarioAtual, dependente_id: Optional[int] = None) -> dict:
    """Só o que o usuário compartilhou com o assistente (specs repositorio-documentos FR-9 e medicamentos-vacinas FR-8)."""
    documentos.exigir_dependente(usuario_id, dependente_id)
    compartilhados = documento_store.listar_documentos(usuario_id, dependente_id=dependente_id, compartilhados=True)
    leituras = {d["documento_ocr_id"] for d in compartilhados if d["documento_ocr_id"] is not None}
    medicamentos = saude.medicamentos_das_receitas([r for r in prescription_store.listar(usuario_id) if r["documento_ocr_id"] in leituras])
    vacinas = saude_store.listar_vacinas(usuario_id, dependente_id=dependente_id, compartilhadas=True)
    pendentes = saude_store.listar_vacinas(usuario_id, dependente_id=dependente_id, compartilhadas=True, pendentes=True)
    return {"documentos": compartilhados, "medicamentos": medicamentos, "lembretes": saude.lembretes(medicamentos, pendentes, saude_store.doses_tomadas(usuario_id, date.today().isoformat())), "vacinas": vacinas}
