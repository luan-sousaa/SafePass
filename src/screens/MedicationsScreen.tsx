import { useState } from 'react';
import Icon from '../components/Icon';
import DonoSelect, { cardStyle, inputClass } from '../components/DonoSelect';
import { useMedicamentos, type MedicamentoSalvo } from '../services/prescriptions';
import { createMedication, dataBR, hojeISO, updateMedication, useDependentes } from '../services/saude';

function status(med: MedicamentoSalvo) {
  if (med.ativo) return 'Ativo';
  if (med.encerrado_em) return 'Encerrado';
  return med.inicio > hojeISO() ? `Começa em ${dataBR(med.inicio)}` : 'Período terminado';
}

function NovoMedicamento({ onSalvo }: { onSalvo: () => void }) {
  const [form, setForm] = useState({ medicamento: '', dose: '', posologia: '', inicio: hojeISO(), duracao: '', dono: '' });
  const [erro, setErro] = useState('');
  const set = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [campo]: e.target.value }));

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMedication({
        medicamento: form.medicamento,
        dose: form.dose,
        posologia: form.posologia,
        inicio: form.inicio,
        duracao_dias: form.duracao ? Number(form.duracao) : null,
        dependente_id: form.dono ? Number(form.dono) : null,
      });
      onSalvo();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar o medicamento.');
    }
  };

  return (
    <form onSubmit={salvar} className="rounded-lg p-5 space-y-3" style={cardStyle}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input required className={inputClass} placeholder="Medicamento (ex.: Losartana)" value={form.medicamento} onChange={set('medicamento')} />
        <input className={inputClass} placeholder="Dosagem (ex.: 50 mg)" value={form.dose} onChange={set('dose')} />
        <input className={inputClass} placeholder="Posologia (ex.: 1x ao dia, 8/8h)" value={form.posologia} onChange={set('posologia')} />
        <DonoSelect value={form.dono} onChange={set('dono')} />
        <label className="text-xs space-y-1" style={{ color: 'var(--muted-foreground)' }}>
          <span>Início</span>
          <input required type="date" className={inputClass} value={form.inicio} onChange={set('inicio')} />
        </label>
        <label className="text-xs space-y-1" style={{ color: 'var(--muted-foreground)' }}>
          <span>Duração em dias (vazio = uso contínuo)</span>
          <input type="number" min={1} className={inputClass} value={form.duracao} onChange={set('duracao')} />
        </label>
      </div>
      {erro && <p className="text-xs" style={{ color: '#b91c1c' }}>{erro}</p>}
      <button type="submit" className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:opacity-90">
        Salvar medicamento
      </button>
    </form>
  );
}

export default function MedicationsScreen() {
  const [versao, setVersao] = useState(0);
  const [novo, setNovo] = useState(false);
  const meds = useMedicamentos(versao);
  const nomes = new Map(useDependentes().map(d => [d.id, d.nome]));
  const recarregar = () => setVersao(v => v + 1);

  const encerrar = async (id: number) => {
    await updateMedication(id, { encerrado_em: hojeISO() }).catch(() => {});
    recarregar();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{meds.filter(m => m.ativo).length} medicamentos ativos</p>
        <button
          onClick={() => setNovo(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--primary)' }}
        >
          {novo ? 'Cancelar' : '+ Novo'}
        </button>
      </div>

      {novo && <NovoMedicamento onSalvo={() => { setNovo(false); recarregar(); }} />}

      {meds.length === 0 && !novo && (
        <p className="text-sm text-center py-10" style={{ color: 'var(--muted-foreground)' }}>
          Nenhum medicamento ainda. Cadastre em "+ Novo" ou envie uma receita em Documentos.
        </p>
      )}

      {meds.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={cardStyle}>
          {meds.map((med, i) => (
            <div
              key={med.id ?? `r${med.receita_id}-${i}`}
              className="p-5 transition-colors border-b last:border-b-0 hover:bg-[var(--muted)]"
              style={{ borderColor: 'var(--border)', opacity: med.ativo ? 1 : 0.6 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                  <Icon name="medication" className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                      {`${med.medicamento} ${med.dose}`.trim()}
                      {med.dependente_id && <span className="font-normal" style={{ color: 'var(--muted-foreground)' }}> · {nomes.get(med.dependente_id)}</span>}
                    </p>
                    <span className="text-xs font-medium shrink-0" style={{ color: med.ativo ? 'var(--brand)' : 'var(--muted-foreground)' }}>
                      {status(med)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
                    {[
                      { label: 'Dosagem', value: med.dose || '—' },
                      { label: 'Frequência', value: med.posologia || '—' },
                      { label: 'Período', value: med.duracao_dias ? `${med.duracao_dias} dias desde ${dataBR(med.inicio)}` : med.periodo || 'Contínuo' },
                      { label: 'Horários', value: med.horarios.join(' · ') || 'Conforme necessário' },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item.label}</p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: item.label === 'Horários' ? 'var(--brand)' : 'var(--foreground)' }}>
                          {item.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {med.origem === 'receita' ? `Da receita${med.medico ? ` de ${med.medico}` : ''}` : 'Cadastrado manualmente'}
                    </span>
                    {med.origem === 'manual' && med.ativo && med.id !== null && (
                      <button onClick={() => encerrar(med.id!)} className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
                        Encerrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
