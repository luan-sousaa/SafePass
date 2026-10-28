import { request, useList, type MedicamentoSalvo } from './prescriptions';

// Contrato: agente/agents/specs/medicamentos-vacinas.md

export type Dependente = { id: number; nome: string; parentesco: string; data_nascimento: string | null };

export type MedicamentoManualIn = {
  medicamento: string;
  dose: string;
  posologia: string;
  inicio: string; // AAAA-MM-DD
  duracao_dias: number | null; // null = contínuo
  dependente_id: number | null;
};

export type VacinaIn = {
  nome: string;
  dose: string;
  data_aplicacao: string;
  proxima_dose: string | null;
  dependente_id: number | null;
  documento_id: number | null;
  compartilhado_assistente: boolean;
};

export type Vacina = VacinaIn & { id: number; criado_em: string };

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const createMedication = (m: MedicamentoManualIn) => request<MedicamentoSalvo>('/api/medications', json('POST', m));
export const updateMedication = (id: number, campos: Partial<MedicamentoManualIn> & { encerrado_em?: string | null }) =>
  request<MedicamentoSalvo>(`/api/medications/${id}`, json('PATCH', campos));

export const createVaccine = (v: VacinaIn) => request<Vacina>('/api/vacinas', json('POST', v));
export const updateVaccine = (id: number, campos: Partial<VacinaIn>) => request<Vacina>(`/api/vacinas/${id}`, json('PATCH', campos));

export const useVacinas = (versao = 0) => useList<Vacina>('/api/vacinas', versao);
export const useDependentes = () => useList<Dependente>('/api/dependentes');

/** "2026-10-28" → "28/10/2026" */
export const dataBR = (iso: string) => iso.split('-').reverse().join('/');

/** Data de hoje no fuso local, em AAAA-MM-DD. */
export const hojeISO = () => new Date().toLocaleDateString('sv-SE');
