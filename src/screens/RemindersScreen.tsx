import { useState } from 'react';
import Icon from '../components/Icon';
import { useLembretes } from '../services/prescriptions';
import { dataBR, useDependentes } from '../services/saude';

export default function RemindersScreen() {
  const [desligados, setDesligados] = useState<Set<number>>(new Set());
  const nomes = new Map(useDependentes().map(d => [d.id, d.nome]));

  const items = useLembretes().map((l, i) => ({
    time: l.horario ?? (l.data ? dataBR(l.data) : ''),
    label: `${l.medicamento} ${l.dose}`.trim(),
    type: l.tipo === 'vacina' ? 'Vacina — próxima dose' : 'Medicamento',
    days: [l.tipo === 'medicamento' && (l.periodo ? `Diário por ${l.periodo}` : 'Diário'), l.dependente_id && nomes.get(l.dependente_id)]
      .filter(Boolean)
      .join(' · '),
    active: !desligados.has(i),
  }));

  const alternar = (i: number) =>
    setDesligados(prev => {
      const next = new Set(prev);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{items.filter(r => r.active).length} lembretes ativos</p>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--primary)' }}
        >
          + Novo lembrete
        </button>
      </div>

      <div className="space-y-3">
        {items.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-lg transition-all"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              opacity: r.active ? 1 : 0.55,
            }}
          >
            <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
              <Icon name="reminder" className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{r.label}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                  {r.type}
                </span>
                <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{r.days}</span>
              </div>
            </div>
            <div className="text-center shrink-0">
              <p className="text-base font-semibold" style={{ color: 'var(--brand-dark)' }}>{r.time}</p>
            </div>
            <button
              onClick={() => alternar(i)}
              className="w-12 h-6 rounded-full relative transition-all shrink-0"
              style={{ background: r.active ? 'var(--primary)' : 'var(--border)' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                style={{ left: r.active ? '26px' : '2px' }}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
