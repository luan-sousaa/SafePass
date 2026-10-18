import { useEffect, useState } from 'react';

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
  medico: string | null;
  data_receita: string | null; // AAAA-MM-DD
  medicamentos: Medicamento[];
};

export type ReceitaIn = {
  medico: string | null;
  data_receita: string | null;
  medicamentos: Omit<Medicamento, 'precisa_revisar'>[];
};

export type Receita = ReceitaIn & { id: number; criado_em: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, signal: AbortSignal.timeout(60_000) });
  } catch (err) {
    throw new Error(
      err instanceof DOMException && err.name === 'TimeoutError'
        ? 'O serviço demorou demais para responder. Tente novamente.'
        : 'Não foi possível conectar ao serviço. Verifique sua conexão.',
    );
  }

  if (!res.ok) {
    // 4xx da API trazem { detail: "mensagem pronta pro usuário" }; o resto vira mensagem genérica.
    const detail = await res.json().then((b: { detail?: unknown }) => b.detail, () => null);
    throw new Error(typeof detail === 'string' ? detail : 'O serviço está indisponível no momento.');
  }

  return res.json();
}

export function extractPrescription(file: File): Promise<Extracao> {
  const body = new FormData();
  body.append('file', file);
  return request('/api/prescriptions/extract', { method: 'POST', body });
}

export function savePrescription(receita: ReceitaIn): Promise<Receita> {
  return request('/api/prescriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(receita),
  });
}

/** Receitas salvas, mais recente primeiro. Lista vazia enquanto carrega ou se a API estiver fora. */
export function useReceitas(): Receita[] {
  const [receitas, setReceitas] = useState<Receita[]>([]);
  useEffect(() => {
    request<Receita[]>('/api/prescriptions').then(setReceitas, () => {});
  }, []);
  return receitas;
}
