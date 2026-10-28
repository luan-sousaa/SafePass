from typing import Annotated, Optional

from fastapi import Depends, Header, HTTPException, UploadFile

MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# Tipo detectado pela assinatura do arquivo, não pelo Content-Type que o cliente declara.
IMAGENS = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
}
DOCUMENTOS = {**IMAGENS, b"%PDF-": "application/pdf"}


def usuario_atual(x_usuario_id: Annotated[Optional[str], Header()] = None) -> str:
    # ponytail: header só para dev, qualquer um pode se passar por outro usuário. Troca pela
    # validação do JWT do grupo LOGIN aqui, num lugar só (spec repositorio-documentos, FR-1).
    if not x_usuario_id:
        raise HTTPException(401, "Usuário não identificado.")
    return x_usuario_id


UsuarioAtual = Annotated[str, Depends(usuario_atual)]


def ler_arquivo(file: UploadFile, assinaturas: dict[bytes, str], tipos_aceitos: str) -> tuple[bytes, str]:
    """Lê o upload e devolve (bytes, mime_type), ou 400/413/415."""
    conteudo = file.file.read(MAX_UPLOAD_BYTES + 1)

    if not conteudo:
        raise HTTPException(400, "Arquivo vazio.")
    if len(conteudo) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Arquivo maior que 10 MB.")

    mime_type = next((mime for sig, mime in assinaturas.items() if conteudo.startswith(sig)), None)
    if mime_type is None:
        raise HTTPException(415, f"Envie {tipos_aceitos}.")
    return conteudo, mime_type
