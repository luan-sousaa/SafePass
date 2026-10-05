import { useState } from 'react';
import UiIcon from '../components/UiIcon';

const dependents = [
  {
    name: 'Pedro Souza',
    relation: 'Filho',
    age: '8 anos',
    avatar: 'P',
    docs: 12,
    meds: 2,
    nextReminder: 'Vacina BCG – 25 set',
    conditions: ['Asma leve'],
  },
  {
    name: 'Maria Souza',
    relation: 'Mãe',
    age: '64 anos',
    avatar: 'M',
    docs: 38,
    meds: 4,
    nextReminder: 'Cardiologia – 30 set',
    conditions: ['Hipertensão', 'Diabetes tipo 2'],
  },
];

export default function DependentsScreen() {
  const [selected, setSelected] = useState<number | null>(null);

  if (selected !== null) {
    const dep = dependents[selected];
    return (
      <div className="animate-fade-in space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: 'var(--primary)' }}
        >
          ← Voltar
        </button>

        <div className="rounded-lg p-6" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold"
              style={{ background: 'var(--nav-active)', color: 'var(--brand-dark)', border: '1px solid var(--border)' }}
            >
              {dep.avatar}
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--brand-dark)' }}>{dep.name}</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{dep.relation} · {dep.age}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: 'Documentos', value: dep.docs },
              { label: 'Medicamentos', value: dep.meds },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-lg" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                <p className="text-2xl font-semibold" style={{ color: 'var(--brand-dark)' }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{s.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--muted-foreground)' }}>Condições</p>
              <div className="flex flex-wrap gap-2">
                {dep.conditions.map(c => (
                  <span key={c} className="px-3 py-1 rounded-md text-xs font-medium" style={{ background: 'var(--muted)', color: 'var(--brand-dark)', border: '1px solid var(--border)' }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--muted-foreground)' }}>Próximo lembrete</p>
              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                <UiIcon name="reminder" className="w-4 h-4" />
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{dep.nextReminder}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{dependents.length} dependentes cadastrados</p>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--primary)' }}
        >
          + Adicionar
        </button>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        {dependents.map((dep, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            className="w-full p-5 text-left transition-colors border-b last:border-b-0 hover:bg-[var(--muted)]"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold shrink-0"
                style={{ background: 'var(--nav-active)', color: 'var(--brand-dark)', border: '1px solid var(--border)' }}
              >
                {dep.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold" style={{ color: 'var(--brand-dark)' }}>{dep.name}</p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{dep.relation} · {dep.age}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{dep.docs} documentos</span>
                  <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{dep.meds} medicamentos</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--brand)' }}>Próximo</p>
                <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{dep.nextReminder}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
