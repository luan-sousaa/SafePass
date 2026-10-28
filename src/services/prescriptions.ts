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
  documento_ocr_id: number; // mandar de volta ao salvar (spec documento-ocr)
  origem: 'gemini' | 'tesseract';
  precisa_revisar: boolean;
  observacoes: string | null;
  medico: string | null;
  data_receita: string | null; // AAAA-MM-DD
  medicamentos: Medicamento[];
};

export type ReceitaIn = {
  documento_ocr_id: number | null; // null = preenchimento manual
  medico: string | null;
  data_receita: string | null;
  medicamentos: Omit<Medicamento, 'precisa_revisar'>[];
};

export type Receita = ReceitaIn & { id: number; criado_em: string };

export type MedicamentoSalvo = Omit<Medicamento, 'precisa_revisar'> & {
  receita_id: number;
  medico: string | null;
  data_receita: string | null;
  horarios: string[]; // "HH:MM", calculados da posologia; vazio se não der pra calcular
};

export type Lembrete = { medicamento: string; dose: string; periodo: string; horario: string };

// ponytail: usuário fixo só para dev. Quando o login do outro grupo existir, aqui vira
// `Authorization: Bearer <token>` (spec repositorio-documentos, FR-1).
const USUARIO_DEV = 'dev';

/** Toda chamada à API passa por aqui: identifica o usuário, aplica o timeout e traduz os erros. */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { ...(init?.headers as Record<string, string>), 'X-Usuario-Id': USUARIO_DEV },
      signal: AbortSignal.timeout(60_000),
    });
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

  if (res.status === 204) return undefined as T;
  // Arquivo (download de documento) volta como Blob; o resto da API é JSON.
  return res.headers.get('Content-Type')?.includes('application/json') ? res.json() : (res.blob() as Promise<T>);
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

/**
 * GET de uma lista da API. Lista vazia enquanto carrega ou se a API estiver fora.
 * Mudar `versao` busca de novo (ex.: depois de editar ou apagar um item).
 */
export function useList<T>(path: string, versao = 0): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    request<T[]>(path).then(setItems, () => {});
  }, [path, versao]);
  return items;
}

/** Receitas salvas, mais recente primeiro. */
export const useReceitas = () => useList<Receita>('/api/prescriptions');
export const useMedicamentos = () => useList<MedicamentoSalvo>('/api/medications');
export const useLembretes = () => useList<Lembrete>('/api/reminders');
