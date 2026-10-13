import Icon from '../components/Icon';

const timeline = [
  { date: '18 set 2026', items: [
    { type: 'Receita', name: 'Omeprazol 20mg', detail: 'Dr. Carlos Lima – CRM 45821' },
  ]},
  { date: '12 set 2026', items: [
    { type: 'Exame', name: 'Hemograma Completo', detail: 'Lab. Einstein – Resultado normal' },
  ]},
  { date: '05 set 2026', items: [
    { type: 'Consulta', name: 'Cardiologia', detail: 'Dr. Roberto Farias – Sem alterações' },
    { type: 'Receita', name: 'Losartana 50mg', detail: 'Renovação de prescrição' },
  ]},
  { date: '02 set 2026', items: [
    { type: 'Vacina', name: 'Influenza 2026', detail: 'UBS Consolação – Dose única anual' },
  ]},
  { date: '20 ago 2026', items: [
    { type: 'Exame', name: 'Raio-X Tórax', detail: 'Lab. Fleury – Sem alterações' },
  ]},
  { date: '15 ago 2026', items: [
    { type: 'Consulta', name: 'Dermatologia', detail: 'Dra. Beatriz Costa – Acompanhamento' },
  ]},
];

export default function HistoryScreen() {
  return (
    <div className="space-y-2 animate-fade-in max-w-2xl">
      <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
        Linha do tempo de prescrições, exames e consultas.
      </p>

      {timeline.map((group, gi) => (
        <div key={gi} className="flex gap-4">
          {/* Timeline axis */}
          <div className="flex flex-col items-center" style={{ width: 32 }}>
            <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: 'var(--primary)', border: '2px solid white', boxShadow: '0 0 0 2px var(--primary)' }} />
            {gi < timeline.length - 1 && (
              <div className="flex-1 w-px mt-1" style={{ background: 'var(--border)' }} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted-foreground)' }}>
              {group.date}
            </p>
            <div className="space-y-3">
              {group.items.map((item, ii) => (
                <div
                  key={ii}
                  className="flex items-center gap-4 p-4 rounded-lg"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                    <Icon name="document" className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{item.name}</p>
                      <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
