import { request, useList } from './prescriptions';

// Contrato: docs/contrato-assistente-ia.md e agente/agents/specs/repositorio-documentos.md
export type TipoDocumento = 'receita' | 'exame' | 'consulta' | 'vacina' | 'atestado';

export const tiposDocumento: { value: TipoDocumento; label: string }[] = [
  { value: 'receita', label: 'Receita' },
  { value: 'exame', label: 'Exame' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'vacina', label: 'Vacina' },
  { value: 'atestado', label: 'Atestado' },
];

export const tipoLabel = (tipo: TipoDocumento) => tiposDocumento.find(t => t.value === tipo)?.label ?? tipo;

export type Dono =
  | { tipo: 'usuario'; id: string }
  | { tipo: 'dependente'; id: number; nome: string; parentesco: string };

export type Documento = {
  id: number;
  tipo: TipoDocumento;
  titulo: string;
  data_documento: string | null; // AAAA-MM-DD
  dependente_id: number | null; // null = do próprio usuário
  dono: Dono;
  mime_type: string | null; // null = sem arquivo (receita digitada à mão)
  tamanho: number | null;
  documento_ocr_id: number | null;
  dados: Record<string, unknown> | null;
  compartilhado_assistente: boolean;
  criado_em: string;
};

export type DocumentoPatch = Partial<Pick<Documento, 'tipo' | 'titulo' | 'data_documento' | 'dependente_id' | 'compartilhado_assistente'>>;

export type Dependente = { id: number; nome: string; parentesco: string; data_nascimento: string | null };
export type DependenteIn = Omit<Dependente, 'id'>;

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

/** Documentos do usuário, mais recente primeiro. Filtros vazios não vão na URL. */
export function useDocumentos(filtros: { tipo?: string; busca?: string; dependente_id?: number } = {}, versao = 0) {
  const params = new URLSearchParams(
    Object.entries(filtros).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]),
  );
  return useList<Documento>(`/api/documentos${params.size ? `?${params}` : ''}`, versao);
}

export const useDependentes = (versao = 0) => useList<Dependente>('/api/dependentes', versao);

export function enviarDocumento(doc: { arquivo: File; tipo: TipoDocumento; titulo: string; data_documento: string; dependente_id: number | null }) {
  const body = new FormData();
  body.append('arquivo', doc.arquivo);
  body.append('tipo', doc.tipo);
  body.append('titulo', doc.titulo);
  if (doc.data_documento) body.append('data_documento', doc.data_documento);
  if (doc.dependente_id !== null) body.append('dependente_id', String(doc.dependente_id));
  return request<Documento>('/api/documentos', { method: 'POST', body });
}

export const atualizarDocumento = (id: number, campos: DocumentoPatch) => request<Documento>(`/api/documentos/${id}`, json('PATCH', campos));

export const apagarDocumento = (id: number) => request<void>(`/api/documentos/${id}`, { method: 'DELETE' });

const extensoes: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf' };

/** O arquivo exige o header do usuário, então não dá para usar um <a href> direto: baixa e salva. */
export async function baixarDocumento(doc: Documento) {
  const blob = await request<Blob>(`/api/documentos/${doc.id}/arquivo`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = doc.titulo + (extensoes[doc.mime_type ?? ''] ?? '');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // o Safari cancela o download se revogar na hora
}

export const criarDependente = (dep: DependenteIn) => request<Dependente>('/api/dependentes', json('POST', dep));

export const atualizarDependente = (id: number, dep: DependenteIn) => request<Dependente>(`/api/dependentes/${id}`, json('PATCH', dep));

export const apagarDependente = (id: number) => request<void>(`/api/dependentes/${id}`, { method: 'DELETE' });

/** "Eu" ou "Nome (Parentesco)". */
export const nomeDono = (dono: Dono) => (dono.tipo === 'usuario' ? 'Eu' : `${dono.nome} (${dono.parentesco})`);

/** "2026-09-17" → "17 set 2026", como o resto do app. */
export const formatarData = (iso: string | null) =>
  iso
    ? new Date(iso.slice(0, 10) + 'T00:00')
        .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        .replace(/\.| de/g, '')
    : 'Sem data';
