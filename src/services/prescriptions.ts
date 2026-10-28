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

// Contrato: agente/agents/specs/medicamentos-vacinas.md
export type MedicamentoSalvo = Omit<Medicamento, 'precisa_revisar'> & {
  id: number | null; // só no manual
  origem: 'receita' | 'manual';
  receita_id: number | null;
  medico: string | null;
  data_receita: string | null;
  horarios: string[]; // "HH:MM", calculados da posologia; vazio se não der pra calcular
  dependente_id: number | null;
  inicio: string; // AAAA-MM-DD
  duracao_dias: number | null; // null = contínuo
  encerrado_em: string | null;
  ativo: boolean;
};

export type Lembrete = {
  tipo: 'medicamento' | 'vacina';
  medicamento: string; // nome do medicamento ou da vacina
  dose: string;
  periodo: string;
  horario: string | null; // null em vacina
  data: string | null; // próxima dose da vacina
  dependente_id: number | null;
};

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

  return res.status === 204 ? (undefined as T) : res.json();
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

/** GET de uma lista da API. Lista vazia enquanto carrega ou se a API estiver fora. Mude `versao` para recarregar. */
export function useList<T>(path: string, versao = 0): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    request<T[]>(path).then(setItems, () => {});
  }, [path, versao]);
  return items;
}

/** Receitas salvas, mais recente primeiro. */
export const useReceitas = () => useList<Receita>('/api/prescriptions');
export const useMedicamentos = (versao = 0) => useList<MedicamentoSalvo>('/api/medications', versao);
export const useLembretes = () => useList<Lembrete>('/api/reminders');
