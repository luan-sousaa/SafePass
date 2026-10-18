import Icon from '../components/Icon';
import { useReceitas } from '../services/prescriptions';

const meds = [
  { name: 'Omeprazol 20mg', dose: '20 mg', freq: '1x ao dia', period: '30 dias', next: 'Hoje, 08:00', status: 'ativo' },
  { name: 'Vitamina D 2000UI', dose: '2000 UI', freq: '1x ao dia', period: 'Contínuo', next: 'Hoje, 19:00', status: 'ativo' },
  { name: 'Amoxicilina 500mg', dose: '500 mg', freq: '3x ao dia', period: '7 dias', next: 'Hoje, 12:00', status: 'ativo' },
  { name: 'Ômega 3', dose: '1000 mg', freq: '2x ao dia', period: 'Contínuo', next: 'Amanhã, 08:00', status: 'ativo' },
  { name: 'Losartana 50mg', dose: '50 mg', freq: '1x ao dia', period: 'Contínuo', next: 'Amanhã, 07:00', status: 'ativo' },
];

export default function MedicationsScreen() {
  const salvos = useReceitas().flatMap(r =>
    r.medicamentos.map(m => ({
      name: `${m.medicamento} ${m.dose}`.trim(),
      dose: m.dose || '—',
      freq: m.posologia || '—',
      period: m.periodo || '—',
      next: '—', // ponytail: sem horário da 1ª dose ainda; entra com os lembretes de verdade
    })),
  );
  const all = [...salvos, ...meds];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{all.length} medicamentos ativos</p>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--primary)' }}
        >
          + Novo
        </button>
      </div>

      <div className="rounded-lg overflow-hidden" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        {all.map((med, i) => (
          <div
            key={i}
            className="p-5 transition-colors border-b last:border-b-0 hover:bg-[var(--muted)]"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                <Icon name="medication" className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{med.name}</p>
                  <span className="text-xs font-medium" style={{ color: 'var(--brand)' }}>
                    Ativo
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2">
                  {[
                    { label: 'Dosagem', value: med.dose },
                    { label: 'Frequência', value: med.freq },
                    { label: 'Período', value: med.period },
                    { label: 'Próxima dose', value: med.next },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{item.label}</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: item.label === 'Próxima dose' ? 'var(--brand)' : 'var(--foreground)' }}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
