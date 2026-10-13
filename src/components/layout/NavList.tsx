import Icon, { type IconName } from '../Icon';
import type { Screen } from '../../types';

const navItems: { id: Screen; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Início', icon: 'home' },
  { id: 'documents', label: 'Documentos', icon: 'document' },
  { id: 'history', label: 'Histórico', icon: 'history' },
  { id: 'medications', label: 'Medicamentos', icon: 'medication' },
  { id: 'reminders', label: 'Lembretes', icon: 'reminder' },
  { id: 'dependents', label: 'Dependentes', icon: 'users' },
  { id: 'chat', label: 'Assistente IA', icon: 'assistant' },
  { id: 'profile', label: 'Perfil', icon: 'user' },
];

export const screenTitles: Record<Screen, string> = {
  ...Object.fromEntries(navItems.map(item => [item.id, item.label])) as Record<Screen, string>,
  'add-document': 'Adicionar Documento',
};

export default function NavList({ current, onSelect }: { current: Screen; onSelect: (s: Screen) => void }) {
  return (
    <nav className="flex-1 px-3 py-5 space-y-1">
      {navItems.map(({ id, label, icon }) => {
        const active = current === id || (current === 'add-document' && id === 'documents');
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              active ? '' : 'hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
            style={{
              background: active ? 'var(--nav-active)' : undefined,
              color: active ? 'var(--brand-dark)' : 'var(--muted-foreground)',
            }}
          >
            <Icon name={icon} className="w-4 h-4 shrink-0" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
