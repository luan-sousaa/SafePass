import { useState } from 'react';
import Icon from '../components/Icon';
import {
  apagarDependente,
  atualizarDependente,
  criarDependente,
  useDependentes,
  useDocumentos,
  type Dependente,
  type DependenteIn,
} from '../services/documentos';

const inputClass =
  'w-full px-3 py-2 rounded-lg text-sm outline-none border border-[var(--border)] focus:border-[var(--primary)] bg-[var(--card)] text-[var(--foreground)]';

const idade = (nascimento: string | null) => {
  if (!nascimento) return null;
  const hoje = new Date();
  const nasc = new Date(nascimento + 'T00:00');
  const anos = hoje.getFullYear() - nasc.getFullYear() - (hoje < new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate()) ? 1 : 0);
  return `${anos} ano${anos !== 1 ? 's' : ''}`;
};

export default function DependentsScreen() {
  const [versao, setVersao] = useState(0);
  const [editing, setEditing] = useState<number | 'novo' | null>(null);
  const [erro, setErro] = useState('');
  const dependentes = useDependentes(versao);
  const docs = useDocumentos({}, versao);

  const run = async (acao: () => Promise<unknown>) => {
    setErro('');
    try {
      await acao();
      setVersao(v => v + 1);
      setEditing(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível concluir a ação.');
    }
  };

  const excluir = (dep: Dependente) => {
    if (confirm(`Remover ${dep.nome} dos dependentes?`)) run(() => apagarDependente(dep.id));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {dependentes.length} dependente{dependentes.length !== 1 ? 's' : ''} cadastrado{dependentes.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => { setErro(''); setEditing('novo'); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--primary)' }}
        >
          + Adicionar
        </button>
      </div>

      {erro && <p className="text-sm font-medium" style={{ color: 'var(--danger)' }}>{erro}</p>}

      {editing === 'novo' && (
        <DependenteForm onCancel={() => setEditing(null)} onSave={dep => run(() => criarDependente(dep))} />
      )}

      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        {dependentes.map(dep => {
          const totalDocs = docs.filter(d => d.dependente_id === dep.id).length;
          return (
            <div key={dep.id} className="p-5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold shrink-0"
                  style={{ background: 'var(--nav-active)', color: 'var(--brand-dark)', border: '1px solid var(--border)' }}
                >
                  {dep.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold" style={{ color: 'var(--brand-dark)' }}>{dep.nome}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                    {[dep.parentesco, idade(dep.data_nascimento)].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                    {totalDocs} documento{totalDocs !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1" style={{ color: 'var(--brand)' }}>
                  <button
                    aria-label={`Editar ${dep.nome}`}
                    title="Editar"
                    onClick={() => { setErro(''); setEditing(editing === dep.id ? null : dep.id); }}
                    className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--muted)]"
                  >
                    <Icon name="edit" className="w-4 h-4" />
                  </button>
                  <button
                    aria-label={`Remover ${dep.nome}`}
                    title="Remover"
                    onClick={() => excluir(dep)}
                    className="w-8 h-8 rounded-md flex items-center justify-center transition-colors hover:bg-[var(--muted)]"
                    style={{ color: 'var(--danger)' }}
                  >
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {editing === dep.id && (
                <div className="mt-4">
                  <DependenteForm dependente={dep} onCancel={() => setEditing(null)} onSave={campos => run(() => atualizarDependente(dep.id, campos))} />
                </div>
              )}
            </div>
          );
        })}

        {dependentes.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--muted-foreground)' }}>
            <Icon name="users" className="w-8 h-8 mx-auto mb-3" />
            <p className="text-sm font-medium">Nenhum dependente cadastrado</p>
            <p className="text-xs mt-1">Adicione filhos, pais ou outras pessoas cujos documentos você organiza.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DependenteForm({ dependente, onCancel, onSave }: {
  dependente?: Dependente;
  onCancel: () => void;
  onSave: (dep: DependenteIn) => void;
}) {
  const [nome, setNome] = useState(dependente?.nome ?? '');
  const [parentesco, setParentesco] = useState(dependente?.parentesco ?? '');
  const [nascimento, setNascimento] = useState(dependente?.data_nascimento ?? '');

  return (
    <form
      className="grid gap-3 sm:grid-cols-3 p-4 rounded-lg"
      style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
      onSubmit={e => {
        e.preventDefault();
        onSave({ nome: nome.trim(), parentesco: parentesco.trim(), data_nascimento: nascimento || null });
      }}
    >
      <FormField label="Nome">
        <input required value={nome} placeholder="Ex.: Pedro Souza" onChange={e => setNome(e.target.value)} className={inputClass} />
      </FormField>
      <FormField label="Parentesco">
        <input required value={parentesco} placeholder="Ex.: Filho" onChange={e => setParentesco(e.target.value)} className={inputClass} />
      </FormField>
      <FormField label="Data de nascimento">
        <input type="date" value={nascimento} onChange={e => setNascimento(e.target.value)} className={inputClass} />
      </FormField>
      <div className="flex gap-2 sm:col-span-3 justify-end">
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
      <span>{label}</span>
      {children}
    </label>
  );
}
