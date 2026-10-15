// Contrato: agente/agents/specs/prescription-api.md
export type Medicamento = {
  medicamento: string;
  dose: string;
  posologia: string;
  periodo: string;
  precisa_revisar: boolean;
};

export type Extracao = {
  source: 'gemini' | 'tesseract_fallback';
  needs_manual_review: boolean;
  observacoes: string | null;
  medicamentos: Medicamento[];
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function extractPrescription(file: File): Promise<Extracao> {
  const body = new FormData();
  body.append('file', file);

  let res: Response;
  try {
    res = await fetch('/api/prescriptions/extract', { method: 'POST', body, signal: AbortSignal.timeout(60_000) });
  } catch (err) {
    throw new Error(
      err instanceof DOMException && err.name === 'TimeoutError'
        ? 'A análise demorou demais. Tente novamente.'
        : 'Não foi possível conectar ao serviço de leitura. Verifique sua conexão.',
    );
  }

  if (!res.ok) {
    // 4xx da API trazem { detail: "mensagem pronta pro usuário" }; o resto vira mensagem genérica.
    const detail = await res.json().then((b: { detail?: unknown }) => b.detail, () => null);
    throw new Error(typeof detail === 'string' ? detail : 'O serviço de leitura está indisponível no momento.');
  }

  return res.json();
}
