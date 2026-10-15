from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile
from pydantic import BaseModel

from config.confidence_config import CONFIDENCE_THRESHOLD
from services.prescription.extraction_service import extract_prescription

MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# Tipo detectado pela assinatura do arquivo, não pelo Content-Type que o cliente declara.
_SIGNATURES = {
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG\r\n\x1a\n": "image/png",
}


class MedicamentoOut(BaseModel):
    medicamento: str
    dose: str
    posologia: str
    periodo: str
    precisa_revisar: bool


class ExtracaoOut(BaseModel):
    source: str
    needs_manual_review: bool
    observacoes: Optional[str]
    medicamentos: list[MedicamentoOut]


app = FastAPI(title="SAFEpass — API de extração de receitas")


@app.post("/api/prescriptions/extract", response_model=ExtracaoOut)
def extract(file: UploadFile) -> ExtracaoOut:
    # `def` (não async): o FastAPI roda em threadpool, e a chamada ao Gemini é bloqueante.
    image_bytes = file.file.read(MAX_UPLOAD_BYTES + 1)

    if not image_bytes:
        raise HTTPException(400, "Arquivo vazio.")
    if len(image_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Arquivo maior que 10 MB.")

    mime_type = next((mime for sig, mime in _SIGNATURES.items() if image_bytes.startswith(sig)), None)
    if mime_type is None:
        raise HTTPException(415, "Envie uma foto em JPG ou PNG.")

    result = extract_prescription(image_bytes, mime_type=mime_type)

    # O número de confiança é interno (spec prescription-extraction, FR-5): só sai o booleano.
    return ExtracaoOut(
        source=result.source,
        needs_manual_review=result.needs_manual_review,
        observacoes=result.data.observacoes,
        medicamentos=[
            MedicamentoOut(
                medicamento=item.medicamento,
                dose=item.dose,
                posologia=item.posologia,
                periodo=item.periodo,
                precisa_revisar=item.confidence < CONFIDENCE_THRESHOLD,
            )
            for item in result.data.medicamentos
        ],
    )
