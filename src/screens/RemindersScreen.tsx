import { useState } from 'react';
import Icon from '../components/Icon';

const reminders = [
  { time: '08:00', label: 'Omeprazol 20mg', type: 'Medicamento', days: 'Diário', color: '#0d9488', active: true },
  { time: '12:00', label: 'Amoxicilina 500mg', type: 'Medicamento', days: 'Diário por 7 dias', color: '#0ea5e9', active: true },
  { time: '19:00', label: 'Vitamina D 2000UI', type: 'Medicamento', days: 'Diário', color: '#f59e0b', active: true },
  { time: '14:30', label: 'Consulta – Dermatologia', type: 'Consulta', days: '28/09/2026', color: '#8b5cf6', active: true },
  { time: '09:00', label: 'Exame de sangue', type: 'Exame', days: '01/10/2026', color: '#0ea5e9', active: false },
  { time: '07:00', label: 'Losartana 50mg', type: 'Medicamento', days: 'Diário', color: '#ef4444', active: false },
];

export default function RemindersScreen() {
  const [items, setItems] = useState(reminders);

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
              onClick={() => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, active: !item.active } : item))}
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
