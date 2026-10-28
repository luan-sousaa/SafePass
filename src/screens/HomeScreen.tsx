import Icon, { type IconName } from '../components/Icon';
import type { Screen } from '../types';
import { formatarData, nomeDono, tipoLabel, useDependentes, useDocumentos } from '../services/documentos';
import { useLembretes, useMedicamentos } from '../services/prescriptions';

export default function HomeScreen({ navigate, user }: { navigate: (s: Screen) => void; user: { name: string } }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const docs = useDocumentos();
  const medicamentos = useMedicamentos();
  const lembretes = useLembretes();
  const dependentes = useDependentes();

  const recentDocs = docs.slice(0, 4); // a API já devolve o mais recente primeiro
  // Os lembretes são horários diários: os que já passaram hoje voltam amanhã.
  const agora = new Date().toTimeString().slice(0, 5);
  const upcomingReminders = lembretes
    .flatMap(l => (l.horario ? [{ ...l, horario: l.horario, amanha: l.horario <= agora }] : [])) // vacina não tem hora
    .sort((a, b) => Number(a.amanha) - Number(b.amanha) || a.horario.localeCompare(b.horario))
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Greeting */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold" style={{ color: 'var(--brand-dark)' }}>
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
          { label: 'Documentos', value: docs.length, icon: 'document' as IconName, nav: 'documents' as Screen },
          { label: 'Medicamentos', value: medicamentos.length, icon: 'medication' as IconName, nav: 'medications' as Screen },
          { label: 'Lembretes', value: lembretes.length, icon: 'reminder' as IconName, nav: 'reminders' as Screen },
          { label: 'Dependentes', value: dependentes.length, icon: 'users' as IconName, nav: 'dependents' as Screen },
        ].map(card => (
          <button
            key={card.label}
            onClick={() => navigate(card.nav)}
            className="group p-4 rounded-lg text-left transition-colors hover:border-[var(--brand)]"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                <Icon name={card.icon} className="w-4 h-4" />
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
            <h3 className="text-xl font-semibold" style={{ color: 'var(--brand-dark)' }}>
              Documentos recentes
            </h3>
            <button className="text-sm font-medium" style={{ color: 'var(--primary)' }} onClick={() => navigate('documents')}>
              Ver todos
            </button>
          </div>
          <div className="space-y-3">
            {recentDocs.length === 0 && <EmptyLine text="Nenhum documento ainda." />}
            {recentDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-4 px-3 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                  <Icon name="document" className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{doc.titulo}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{nomeDono(doc.dono)} · {formatarData(doc.data_documento)}</p>
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--muted-foreground)' }}>
                  {tipoLabel(doc.tipo)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming reminders */}
        <div className="rounded-lg p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl font-semibold" style={{ color: 'var(--brand-dark)' }}>
              Próximos lembretes
            </h3>
            <button className="text-sm font-medium" style={{ color: 'var(--primary)' }} onClick={() => navigate('reminders')}>
              Ver todos
            </button>
          </div>
          <div className="space-y-3">
            {upcomingReminders.length === 0 && <EmptyLine text="Nenhum lembrete. Eles vêm das receitas salvas." />}
            {upcomingReminders.map((r, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: 'var(--muted)', color: 'var(--brand)' }}>
                  <Icon name="reminder" className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{`${r.medicamento} ${r.dose}`.trim()}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Medicamento</p>
                </div>
                <p className="text-xs font-medium shrink-0" style={{ color: 'var(--muted-foreground)' }}>{r.amanha ? 'Amanhã' : 'Hoje'}, {r.horario}</p>
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
            <Icon name="assistant" className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--brand-dark)' }}>
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
          <h3 className="text-xl font-semibold" style={{ color: 'var(--brand-dark)' }}>
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

function EmptyLine({ text }: { text: string }) {
  return <p className="px-3 py-2.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>{text}</p>;
}
