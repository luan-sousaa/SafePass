import { useState } from 'react';

type Tab = 'personal' | 'security' | 'notifications';

export default function ProfileScreen({ user }: { user: { name: string; email: string } }) {
  const [tab, setTab] = useState<Tab>('personal');
  const [notifications, setNotifications] = useState({
    meds: true,
    appointments: true,
    exams: false,
    weekly: true,
  });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'personal', label: 'Dados pessoais' },
    { id: 'security', label: 'Segurança' },
    { id: 'notifications', label: 'Notificações' },
  ];

  return (
    <div className="max-w-2xl animate-fade-in space-y-6">
      {/* Avatar */}
      <div className="rounded-lg p-6 flex items-center gap-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold shrink-0"
          style={{ background: 'var(--nav-active)', color: 'var(--brand-dark)', border: '1px solid var(--border)' }}
        >
          {user.name.slice(0, 1)}
        </div>
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: 'var(--brand-dark)' }}>{user.name}</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>{user.email}</p>
          <span className="text-xs font-medium mt-2 inline-block" style={{ color: 'var(--brand)' }}>
            Conta verificada
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--muted)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'var(--card)' : 'transparent',
              color: tab === t.id ? 'var(--foreground)' : 'var(--muted-foreground)',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'personal' && (
        <div className="rounded-lg p-6 space-y-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          {[
            { label: 'Nome completo', value: user.name },
            { label: 'E-mail', value: user.email },
            { label: 'Data de nascimento', value: '14/03/1990' },
            { label: 'CPF', value: '•••.•••.•••-••' },
            { label: 'Telefone', value: '+55 11 99999-0000' },
            { label: 'Tipo sanguíneo', value: 'A+' },
          ].map(field => (
            <div key={field.label} className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                {field.label}
              </label>
              <input
                type="text"
                defaultValue={field.value}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1.5px solid var(--border)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          ))}
          <button
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 mt-2"
            style={{ background: 'var(--primary)' }}
          >
            Salvar alterações
          </button>
        </div>
      )}

      {tab === 'security' && (
        <div className="rounded-lg p-6 space-y-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-xl font-semibold" style={{ color: 'var(--brand-dark)' }}>Alterar senha</h3>
          {['Senha atual', 'Nova senha', 'Confirmar nova senha'].map(label => (
            <div key={label} className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>{label}</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'var(--muted)', color: 'var(--foreground)', border: '1.5px solid var(--border)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          ))}
          <button
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--primary)' }}
          >
            Atualizar senha
          </button>

          <div className="border-t pt-5" style={{ borderColor: 'var(--border)' }}>
            <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--brand-dark)' }}>Autenticação de dois fatores</h3>
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--muted)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>2FA por SMS</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>Ativado – +55 11 •••••-0000</p>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--brand)' }}>Ativo</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="rounded-lg p-6 space-y-4" style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--brand-dark)' }}>Preferências de notificação</h3>
          {[
            { key: 'meds' as const, label: 'Lembretes de medicamentos', desc: 'Alertas para tomar remédios no horário' },
            { key: 'appointments' as const, label: 'Consultas e vacinas', desc: 'Lembretes antes de consultas agendadas' },
            { key: 'exams' as const, label: 'Resultados de exames', desc: 'Notificar quando um resultado for adicionado' },
            { key: 'weekly' as const, label: 'Resumo semanal', desc: 'Relatório de saúde às segundas-feiras' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'var(--muted)' }}>
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{item.label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{item.desc}</p>
              </div>
              <button
                onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key] }))}
                className="w-12 h-6 rounded-full relative transition-all shrink-0"
                style={{ background: notifications[item.key] ? 'var(--primary)' : 'var(--border)' }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                  style={{ left: notifications[item.key] ? '26px' : '2px' }}
                />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
