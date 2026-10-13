import Icon from '../Icon';
import BrandLogo from './BrandLogo';
import NavList from './NavList';
import type { Screen, User } from '../../types';

export default function Sidebar({ current, navigate, user }: { current: Screen; navigate: (s: Screen) => void; user: User }) {
  return (
    <aside className="hidden lg:flex flex-col w-60 border-r shrink-0" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 px-5 h-20 border-b" style={{ borderColor: 'var(--border)' }}>
        <BrandLogo />
      </div>

      <NavList current={current} onSelect={navigate} />

      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => navigate('profile')}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-[var(--muted)]"
        >
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
            style={{ background: 'var(--brand)' }}
          >
            {user.name.split(' ').map(part => part[0]).slice(0, 2).join('')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold truncate" style={{ color: 'var(--brand-dark)' }}>{user.name}</span>
            <span className="block text-xs truncate" style={{ color: 'var(--muted-foreground)' }}>{user.email}</span>
          </span>
          <Icon name="chevron" className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </aside>
  );
}
