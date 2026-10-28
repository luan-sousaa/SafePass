import { useState } from 'react';
import Icon from '../components/Icon';
import DonoSelect, { cardStyle, inputClass } from '../components/DonoSelect';
import { createVaccine, dataBR, hojeISO, updateVaccine, useDependentes, useVacinas } from '../services/saude';

function NovaVacina({ onSalva }: { onSalva: () => void }) {
  const [form, setForm] = useState({ nome: '', dose: '', data_aplicacao: hojeISO(), proxima_dose: '', dono: '', compartilhar: false });
  const [erro, setErro] = useState('');
  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [campo]: e.target.value }));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVaccine({
        nome: form.nome,
        dose: form.dose,
        data_aplicacao: form.data_aplicacao,
        proxima_dose: form.proxima_dose || null,
        dependente_id: form.dono ? Number(form.dono) : null,
        documento_id: null,
        compartilhado_assistente: form.compartilhar,
      });
      onSalva();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a vacina.');
    }
  };

  return (
    <form onSubmit={salvar} className="rounded-lg p-5 space-y-3" style={cardStyle}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input required className={inputClass} placeholder="Vacina (ex.: Hepatite B)" value={form.nome} onChange={set('nome')} />
        <input className={inputClass} placeholder="Dose (ex.: 2ª dose, reforço)" value={form.dose} onChange={set('dose')} />
        <label className="text-xs space-y-1" style={{ color: 'var(--muted-foreground)' }}>
          <span>Aplicada em</span>
          <input required type="date" className={inputClass} value={form.data_aplicacao} onChange={set('data_aplicacao')} />
        </label>
        <label className="text-xs space-y-1" style={{ color: 'var(--muted-foreground)' }}>
          <span>Próxima dose (opcional, vira lembrete)</span>
          <input type="date" className={inputClass} value={form.proxima_dose} onChange={set('proxima_dose')} />
        </label>
        <DonoSelect value={form.dono} onChange={set('dono')} />
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
          <input type="checkbox" checked={form.compartilhar} onChange={e => setForm(prev => ({ ...prev, compartilhar: e.target.checked }))} />
          Compartilhar com o Assistente IA
        </label>
      </div>
      {erro && <p className="text-xs" style={{ color: '#b91c1c' }}>{erro}</p>}
      <button type="submit" className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:opacity-90">
        Registrar vacina
      </button>
    </form>
  );
}

export default function VaccinesScreen() {
  const [versao, setVersao] = useState(0);
  const [nova, setNova] = useState(false);
  const [dono, setDono] = useState('');
  const vacinas = useVacinas(versao).filter(v => (dono ? v.dependente_id === Number(dono) : true));
  const nomes = new Map(useDependentes().map(d => [d.id, d.nome]));
  const recarregar = () => setVersao(v => v + 1);

  const compartilhar = async (id: number, valor: boolean) => {
    await updateVaccine(id, { compartilhado_assistente: valor }).catch(() => {});
    recarregar();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="w-56">
          <DonoSelect value={dono} onChange={e => setDono(e.target.value)} vazio="Todos" />
        </div>
        <button
          onClick={() => setNova(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shrink-0"
          style={{ background: 'var(--primary)' }}
        >
          {nova ? 'Cancelar' : '+ Registrar vacina'}
        </button>
      </div>

      {nova && <NovaVacina onSalva={() => { setNova(false); recarregar(); }} />}

      {vacinas.length === 0 && !nova && (
        <p className="text-sm text-center py-10" style={{ color: 'var(--muted-foreground)' }}>
          Nenhuma vacina registrada {dono ? 'para esta pessoa' : 'ainda'}.
        </p>
      )}

      {vacinas.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={cardStyle}>
          {vacinas.map(v => (
            <div key={v.id} className="p-5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                  <Icon name="shield" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                    {`${v.nome} ${v.dose ? `— ${v.dose}` : ''}`}
                    <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}>
                      {' · '}{v.dependente_id ? nomes.get(v.dependente_id) : 'Você'}
                    </span>
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
                    <div>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Aplicada em</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--foreground)' }}>{dataBR(v.data_aplicacao)}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Próxima dose</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--brand)' }}>{v.proxima_dose ? dataBR(v.proxima_dose) : '—'}</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs mt-3" style={{ color: 'var(--muted-foreground)' }}>
                    <input type="checkbox" checked={v.compartilhado_assistente} onChange={e => compartilhar(v.id, e.target.checked)} />
                    Compartilhada com o Assistente IA
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
