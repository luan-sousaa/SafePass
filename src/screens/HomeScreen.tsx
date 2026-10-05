import type { Screen } from '../App';

const recentDocs = [
  { type: 'Receita', name: 'Omeprazol 20mg', date: '18 set 2026' },
  { type: 'Exame', name: 'Hemograma Completo', date: '12 set 2026' },
  { type: 'Consulta', name: 'Cardiologia – Dr. Farias', date: '05 set 2026' },
  { type: 'Vacina', name: 'Influenza 2026', date: '02 set 2026' },
];

const upcomingReminders = [
  { time: 'Hoje, 08:00', label: 'Omeprazol 20mg', type: 'Medicamento' },
  { time: 'Hoje, 19:00', label: 'Vitamina D 2000UI', type: 'Medicamento' },
  { time: 'Amanhã, 14:30', label: 'Consulta – Dermatologia', type: 'Consulta' },
  { time: '28 set, 09:00', label: 'Exame de sangue', type: 'Exame' },
];

export default function HomeScreen({ navigate, user }: { navigate: (s: Screen) => void; user: { name: string } }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--brand-dark)' }}>
            {greeting}, {user.name.split(' ')[0]}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Aqui está um resumo da sua saúde hoje.
          </p>
        </div>
        <span className="hidden md:block text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
          Visão geral
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Documentos', value: '47', icon: DocumentMetricIcon, nav: 'documents' as Screen },
          { label: 'Medicamentos', value: '5', icon: MedicationMetricIcon, nav: 'medications' as Screen },
          { label: 'Lembretes', value: '3', icon: ReminderMetricIcon, nav: 'reminders' as Screen },
          { label: 'Dependentes', value: '2', icon: DependentMetricIcon, nav: 'dependents' as Screen },
        ].map(card => (
          <button
            key={card.label}
            onClick={() => navigate(card.nav)}
            className="group p-4 rounded-lg text-left transition-colors hover:border-[var(--brand)]"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                <card.icon className="w-4 h-4" />
              </div>
              <span className="text-base transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--muted-foreground)' }}>→</span>
            </div>
            <p className="text-2xl font-semibold mt-4" style={{ color: 'var(--brand-dark)' }}>{card.value}</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{card.label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent documents */}
        <div className="rounded-lg p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold" style={{ color: 'var(--brand-dark)' }}>
              Documentos recentes
            </h3>
            <button className="text-sm font-medium" style={{ color: 'var(--primary)' }} onClick={() => navigate('documents')}>
              Ver todos
            </button>
          </div>
          <div className="space-y-3">
            {recentDocs.map((doc, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                  <DocumentMetricIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{doc.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{doc.type} · {doc.date}</p>
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                  {doc.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming reminders */}
        <div className="rounded-lg p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold" style={{ color: 'var(--brand-dark)' }}>
              Próximos lembretes
            </h3>
            <button className="text-sm font-medium" style={{ color: 'var(--primary)' }} onClick={() => navigate('reminders')}>
              Ver todos
            </button>
          </div>
          <div className="space-y-3">
            {upcomingReminders.map((r, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                  <ReminderMetricIcon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{r.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{r.type}</p>
                </div>
                <p className="text-xs font-medium shrink-0" style={{ color: 'var(--muted-foreground)' }}>{r.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Assistant CTA */}
      <div
        className="rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'var(--muted)', color: 'var(--brand)' }}
          >
            <AssistantIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: 'var(--brand-dark)' }}>
              Assistente de saúde IA
            </h3>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
              Tire dúvidas sobre seus documentos e medicamentos.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('chat')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--primary)' }}
        >
          Conversar
        </button>
      </div>

      {/* Quick add CTA */}
      <div
        className="rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
      >
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--brand-dark)' }}>
            Adicione um novo documento
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Fotografe ou envie receitas, exames e consultas.
          </p>
        </div>
        <button
          onClick={() => navigate('add-document')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 transition-opacity hover:opacity-90"
          style={{ background: 'var(--primary)' }}
        >
          + Adicionar
        </button>
      </div>
    </div>
  );
}

function DocumentMetricIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>;
}

function MedicationMetricIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.5 20.5l10-10a5 5 0 00-7-7l-10 10a5 5 0 007 7z" /><path d="M8.5 8.5l7 7" /></svg>;
}

function ReminderMetricIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M14 21h-4" /></svg>;
}

function DependentMetricIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a5 5 0 0110 0v2M16 4a3 3 0 010 6M17 14a5 5 0 014 4.58V20" /></svg>;
}

function AssistantIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a3 3 0 01-3 3H8l-5 3V6a3 3 0 013-3h12a3 3 0 013 3z" /><path d="M8 9h8M8 13h5" /></svg>;
}
