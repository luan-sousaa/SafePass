import { useState } from 'react';
import type { Screen } from '../types';
import Icon from '../components/Icon';
import {
  apagarDocumento,
  atualizarDocumento,
  baixarDocumento,
  formatarData,
  nomeDono,
  tipoLabel,
  tiposDocumento,
  useDependentes,
  useDocumentos,
  type Dependente,
  type Documento,
  type DocumentoPatch,
} from '../services/documentos';

const inputClass =
  'w-full px-3 py-2 rounded-lg text-sm outline-none border border-[var(--border)] focus:border-[var(--primary)] bg-[var(--card)] text-[var(--foreground)]';
const iconButton = 'w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors hover:bg-[var(--muted)]';

export default function DocumentsScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [tipo, setTipo] = useState('');
  const [search, setSearch] = useState('');
  const [dono, setDono] = useState(''); // '' = todos, 'eu' ou o id do dependente
  const [versao, setVersao] = useState(0);
  const [editing, setEditing] = useState<number | null>(null);
  const [erro, setErro] = useState('');

  const dependentes = useDependentes();
  const docs = useDocumentos({ tipo, busca: search.trim(), dependente_id: dono && dono !== 'eu' ? Number(dono) : undefined }, versao);
  // A API não tem filtro "só meus" (sem dependente_id ela devolve tudo), então esse é feito aqui.
  const filtered = dono === 'eu' ? docs.filter(d => d.dependente_id === null) : docs;

  const run = async (acao: () => Promise<unknown>) => {
    setErro('');
    try {
      await acao();
      setVersao(v => v + 1);
      return true;
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir a ação.');
      return false;
    }
  };

  const excluir = (doc: Documento) => {
    if (confirm(`Excluir "${doc.titulo}"? O arquivo também será apagado.`)) run(() => apagarDocumento(doc.id));
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--muted-foreground)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        <input
          type="text"
          placeholder="Buscar documentos pelo título..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          onFocus={e => { e.target.style.borderColor = 'var(--primary)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[{ value: '', label: 'Todos' }, ...tiposDocumento.map(t => ({ value: t.value, label: `${t.label}s` }))].map(f => (
          <button
            key={f.value}
            onClick={() => setTipo(f.value)}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tipo === f.value ? 'var(--nav-active)' : 'var(--card)',
              color: tipo === f.value ? 'var(--brand-dark)' : 'var(--muted-foreground)',
              border: '1px solid ' + (tipo === f.value ? 'var(--brand)' : 'var(--border)'),
            }}
          >
            {f.label}
          </button>
        ))}
        <select
          aria-label="Filtrar por dono"
          value={dono}
          onChange={e => setDono(e.target.value)}
          className="sm:ml-auto px-3 py-2 rounded-lg text-sm font-medium outline-none"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
        >
          <option value="">Todos os donos</option>
          <option value="eu">Meus documentos</option>
          {dependentes.map(d => <option key={d.id} value={d.id}>{d.nome} ({d.parentesco})</option>)}
        </select>
      </div>

      {/* O que o liga/desliga faz */}
      <div className="flex items-start gap-3 p-4 rounded-lg" style={{ background: 'var(--muted)', border: '1px solid var(--border)', color: 'var(--brand-dark)' }}>
        <Icon name="shield" className="w-5 h-5 shrink-0" />
        <p className="text-xs leading-relaxed">
          <strong>Compartilhar com o assistente</strong> começa desligado em todo documento. O Assistente IA só lê os
          documentos que você ligar (e, nas receitas, os medicamentos e lembretes delas). Você pode desligar quando quiser.
        </p>
      </div>

      {erro && <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{erro}</p>}

      {/* Results count */}
      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
        {filtered.length} documento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Document list */}
      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        {filtered.map(doc => (
          <div key={doc.id} className="p-4 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                <Icon name="document" className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{doc.titulo}</p>
                  <span className="text-xs font-medium shrink-0" style={{ color: 'var(--muted-foreground)' }}>{tipoLabel(doc.tipo)}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{nomeDono(doc.dono)} · {formatarData(doc.data_documento)}</p>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium shrink-0" style={{ color: 'var(--muted-foreground)' }}>
                <span aria-hidden>Compartilhar com o assistente</span>
                <button
                  role="switch"
                  aria-checked={doc.compartilhado_assistente}
                  aria-label={`Compartilhar ${doc.titulo} com o assistente`}
                  onClick={() => run(() => atualizarDocumento(doc.id, { compartilhado_assistente: !doc.compartilhado_assistente }))}
                  className="w-12 h-6 rounded-full relative transition-all shrink-0"
                  style={{ background: doc.compartilhado_assistente ? 'var(--primary)' : 'var(--border)' }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                    style={{ left: doc.compartilhado_assistente ? '26px' : '2px' }}
                  />
                </button>
              </div>

              <div className="flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                {doc.mime_type && (
                  <button aria-label="Baixar" title="Baixar" className={iconButton} onClick={() => run(() => baixarDocumento(doc))}>
                    <Icon name="download" className="w-4 h-4" />
                  </button>
                )}
                <button aria-label="Editar" title="Editar" className={iconButton} onClick={() => setEditing(editing === doc.id ? null : doc.id)}>
                  <Icon name="edit" className="w-4 h-4" />
                </button>
                <button aria-label="Excluir" title="Excluir" className={iconButton} style={{ color: 'var(--danger)' }} onClick={() => excluir(doc)}>
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            </div>

            {editing === doc.id && (
              <EditForm
                doc={doc}
                dependentes={dependentes}
                onCancel={() => setEditing(null)}
                onSave={async campos => { if (await run(() => atualizarDocumento(doc.id, campos))) setEditing(null); }}
              />
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--muted-foreground)' }}>
            <Icon name="search" className="w-8 h-8 mx-auto mb-3" />
            <p className="text-sm font-medium">Nenhum documento encontrado</p>
            <p className="text-xs mt-1">
              Tente outros termos ou filtros, ou{' '}
              <button className="font-semibold" style={{ color: 'var(--primary)' }} onClick={() => navigate('add-document')}>adicione um documento</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EditForm({ doc, dependentes, onCancel, onSave }: {
  doc: Documento;
  dependentes: Dependente[];
  onCancel: () => void;
  onSave: (campos: DocumentoPatch) => void;
}) {
  const [tipo, setTipo] = useState(doc.tipo);
  const [titulo, setTitulo] = useState(doc.titulo);
  const [data, setData] = useState(doc.data_documento ?? '');
  const [dono, setDono] = useState(doc.dependente_id === null ? '' : String(doc.dependente_id));

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mt-4 p-4 rounded-lg"
      style={{ background: 'var(--muted)' }}
      onSubmit={e => {
        e.preventDefault();
        onSave({ tipo, titulo: titulo.trim(), data_documento: data || null, dependente_id: dono ? Number(dono) : null });
      }}
    >
      <EditField label="Classificação">
        <select value={tipo} onChange={e => setTipo(e.target.value as Documento['tipo'])} className={inputClass}>
          {tiposDocumento.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </EditField>
      <EditField label="Título">
        <input required value={titulo} onChange={e => setTitulo(e.target.value)} className={inputClass} />
      </EditField>
      <EditField label="Data">
        <input type="date" value={data} onChange={e => setData(e.target.value)} className={inputClass} />
      </EditField>
      <EditField label="Dono">
        <select value={dono} onChange={e => setDono(e.target.value)} className={inputClass}>
          <option value="">Eu</option>
          {dependentes.map(d => <option key={d.id} value={d.id}>{d.nome} ({d.parentesco})</option>)}
        </select>
      </EditField>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          Cancelar
        </button>
        <button type="submit" className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
          Salvar
        </button>
      </div>
    </form>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
      <span>{label}</span>
      {children}
    </label>
  );
}
