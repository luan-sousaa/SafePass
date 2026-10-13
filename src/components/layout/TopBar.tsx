import { useState } from 'react';
import Icon from '../Icon';
import BrandLogo from './BrandLogo';
import NavList, { screenTitles } from './NavList';
import type { Screen, User } from '../../types';

export default function TopBar({ screen, user, navigate }: { screen: Screen; user: User; navigate: (s: Screen) => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const today = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date());
  const go = (s: Screen) => { navigate(s); setMobileMenuOpen(false); };

  return (
    <>
      <header
        className="flex items-center justify-between px-5 md:px-7 lg:px-8 h-20 border-b shrink-0"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <button className="lg:hidden" style={{ color: 'var(--foreground)' }} onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menu">
            <Icon name="menu" className="w-5 h-5" />
          </button>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--brand-dark)' }}>{screenTitles[screen]}</h1>
            <span className="hidden md:inline text-xs capitalize" style={{ color: 'var(--muted-foreground)' }}>{today}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('add-document')}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: 'var(--primary)' }}
          >
            <Icon name="plus" className="w-4 h-4" />
            Adicionar documento
          </button>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm"
            style={{ background: 'var(--nav-active)', color: 'var(--brand-dark)', border: '1px solid var(--border)' }}
            onClick={() => navigate('profile')}
          >
            {user.name.slice(0, 1)}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 flex flex-col shadow-xl" style={{ background: 'var(--card)' }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <BrandLogo />
              <button style={{ color: 'var(--muted-foreground)' }} onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu">
                <Icon name="x" className="w-5 h-5" />
              </button>
            </div>
            <NavList current={screen} onSelect={go} />
            <div className="px-3 pb-4">
              <button
                onClick={() => go('add-document')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'var(--primary)' }}
              >
                <Icon name="plus" className="w-4 h-4" />
                Adicionar documento
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
