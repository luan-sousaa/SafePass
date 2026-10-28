"""Rotas do repositório documental e dos dependentes — spec: specs/repositorio-documentos.md."""

from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, StringConstraints

from api.deps import DOCUMENTOS, UsuarioAtual, ler_arquivo
from repositories import documento_store

Texto = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
Tipo = Literal["receita", "exame", "consulta", "vacina", "atestado"]


class DependenteIn(BaseModel):
    nome: Texto
    parentesco: Texto
    data_nascimento: Optional[str] = None  # AAAA-MM-DD


# Campos sem Optional não aceitam null explícito: o PATCH só pode omiti-los.
class DependentePatch(BaseModel):
    nome: Texto = None
    parentesco: Texto = None
    data_nascimento: Optional[str] = None


class DependenteOut(DependenteIn):
    id: int


class DocumentoPatch(BaseModel):
    tipo: Tipo = None
    titulo: Texto = None
    data_documento: Optional[str] = None
    dependente_id: Optional[int] = None  # null = passa a ser do próprio usuário
    compartilhado_assistente: bool = None


class DocumentoOut(BaseModel):
    id: int
    tipo: str
    titulo: str
    data_documento: Optional[str]
    dependente_id: Optional[int]
    dono: dict  # {"tipo": "usuario", "id"} | {"tipo": "dependente", "id", "nome", "parentesco"}
    mime_type: Optional[str]
    tamanho: Optional[int]
    documento_ocr_id: Optional[int]
    dados: Optional[dict]  # dados estruturados confirmados no OCR; null se não veio do OCR
    compartilhado_assistente: bool
    criado_em: str


router = APIRouter(prefix="/api")


def _nao_encontrado(oque: str) -> HTTPException:
    return HTTPException(404, f"{oque} não encontrado.")


def exigir_dependente(usuario_id: str, dependente_id: Optional[int]) -> None:
    if dependente_id is not None and documento_store.buscar_dependente(usuario_id, dependente_id) is None:
        raise _nao_encontrado("Dependente")


@router.get("/dependentes", response_model=list[DependenteOut])
def listar_dependentes(usuario_id: UsuarioAtual) -> list[dict]:
    return documento_store.listar_dependentes(usuario_id)


@router.post("/dependentes", status_code=201, response_model=DependenteOut)
def criar_dependente(dependente: DependenteIn, usuario_id: UsuarioAtual) -> dict:
    return documento_store.criar_dependente(usuario_id, dependente.model_dump())


@router.patch("/dependentes/{dependente_id}", response_model=DependenteOut)
def atualizar_dependente(dependente_id: int, campos: DependentePatch, usuario_id: UsuarioAtual) -> dict:
    dependente = documento_store.atualizar_dependente(usuario_id, dependente_id, campos.model_dump(exclude_unset=True))
    if dependente is None:
        raise _nao_encontrado("Dependente")
    return dependente


@router.delete("/dependentes/{dependente_id}", status_code=204)
def apagar_dependente(dependente_id: int, usuario_id: UsuarioAtual) -> None:
    try:
        apagado = documento_store.apagar_dependente(usuario_id, dependente_id)
    except documento_store.DependenteComDocumentos:
        raise HTTPException(409, "Este dependente tem documentos, medicamentos ou vacinas. Mova ou apague esses registros antes.")
    if not apagado:
        raise _nao_encontrado("Dependente")


@router.get("/documentos", response_model=list[DocumentoOut])
def listar_documentos(
    usuario_id: UsuarioAtual,
    tipo: Optional[Tipo] = None,
    dependente_id: Optional[int] = None,
    busca: Optional[str] = None,
    de: Optional[str] = None,
    ate: Optional[str] = None,
) -> list[dict]:
    return documento_store.listar_documentos(usuario_id, tipo=tipo, dependente_id=dependente_id, busca=busca, de=de, ate=ate)


@router.post("/documentos", status_code=201, response_model=DocumentoOut)
def enviar_documento(
    usuario_id: UsuarioAtual,
    arquivo: UploadFile,
    tipo: Annotated[Tipo, Form()],
    titulo: Annotated[Texto, Form()],
    data_documento: Annotated[Optional[str], Form()] = None,
    dependente_id: Annotated[Optional[int], Form()] = None,
) -> dict:
    conteudo, mime_type = ler_arquivo(arquivo, DOCUMENTOS, "um arquivo JPG, PNG ou PDF")
    exigir_dependente(usuario_id, dependente_id)
    return documento_store.criar_documento(usuario_id, {
        "tipo": tipo,
        "titulo": titulo,
        "data_documento": data_documento,
        "dependente_id": dependente_id,
        "arquivo": documento_store.guardar_arquivo(conteudo, mime_type),
        "mime_type": mime_type,
        "tamanho": len(conteudo),
    })


@router.get("/documentos/{documento_id}", response_model=DocumentoOut)
def buscar_documento(documento_id: int, usuario_id: UsuarioAtual) -> dict:
    documento = documento_store.buscar_documento(usuario_id, documento_id)
    if documento is None:
        raise _nao_encontrado("Documento")
    return documento


@router.get("/documentos/{documento_id}/arquivo")
def baixar_arquivo(documento_id: int, usuario_id: UsuarioAtual) -> FileResponse:
    documento = documento_store.buscar_documento(usuario_id, documento_id)
    if documento is None or not documento["arquivo"]:
        raise _nao_encontrado("Arquivo")
    return FileResponse(documento_store.caminho_arquivo(documento["arquivo"]), media_type=documento["mime_type"], filename=documento["arquivo"])


@router.patch("/documentos/{documento_id}", response_model=DocumentoOut)
def atualizar_documento(documento_id: int, campos: DocumentoPatch, usuario_id: UsuarioAtual) -> dict:
    campos_enviados = campos.model_dump(exclude_unset=True)
    exigir_dependente(usuario_id, campos_enviados.get("dependente_id"))
    documento = documento_store.atualizar_documento(usuario_id, documento_id, campos_enviados)
    if documento is None:
        raise _nao_encontrado("Documento")
    return documento


@router.delete("/documentos/{documento_id}", status_code=204)
def apagar_documento(documento_id: int, usuario_id: UsuarioAtual) -> None:
    if not documento_store.apagar_documento(usuario_id, documento_id):
        raise _nao_encontrado("Documento")
