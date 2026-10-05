import { useState } from 'react';
import HomeScreen from './screens/HomeScreen';
import DocumentsScreen from './screens/DocumentsScreen';
import AddDocumentScreen from './screens/AddDocumentScreen';
import MedicationsScreen from './screens/MedicationsScreen';
import RemindersScreen from './screens/RemindersScreen';
import DependentsScreen from './screens/DependentsScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatScreen from './screens/ChatScreen';

export type Screen =
  | 'home'
  | 'documents'
  | 'add-document'
  | 'medications'
  | 'reminders'
  | 'dependents'
  | 'history'
  | 'chat'
  | 'profile';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [user] = useState({ name: 'Ana Souza', email: 'ana@email.com' });

  return (
    <div className="flex h-screen overflow-hidden p-0 lg:p-4" style={{ background: 'var(--background)' }}>
      <div
        className="flex flex-1 min-w-0 overflow-hidden lg:rounded-xl"
        style={{ background: 'var(--app-surface)', boxShadow: 'var(--shadow-app)' }}
      >
        <Sidebar current={screen} navigate={setScreen} user={user} />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <TopBar screen={screen} user={user} navigate={setScreen} />
          <main className={`app-main flex-1 ${screen === 'chat' ? 'overflow-hidden' : 'overflow-y-auto p-5 md:p-7 lg:p-8'}`}>
            {screen === 'home' && <HomeScreen navigate={setScreen} user={user} />}
            {screen === 'documents' && <DocumentsScreen navigate={setScreen} />}
            {screen === 'add-document' && <AddDocumentScreen navigate={setScreen} />}
            {screen === 'medications' && <MedicationsScreen />}
            {screen === 'reminders' && <RemindersScreen />}
            {screen === 'dependents' && <DependentsScreen />}
            {screen === 'history' && <HistoryScreen />}
            {screen === 'chat' && <ChatScreen />}
            {screen === 'profile' && <ProfileScreen user={user} />}
          </main>
        </div>
      </div>
    </div>
  );
}

const navItems = [
  { id: 'home', label: 'Início', icon: HomeIcon },
  { id: 'documents', label: 'Documentos', icon: DocumentIcon },
  { id: 'history', label: 'Histórico', icon: HistoryIcon },
  { id: 'medications', label: 'Medicamentos', icon: PillIcon },
  { id: 'reminders', label: 'Lembretes', icon: BellIcon },
  { id: 'dependents', label: 'Dependentes', icon: UsersIcon },
  { id: 'chat', label: 'Assistente IA', icon: ChatIcon },
  { id: 'profile', label: 'Perfil', icon: UserIcon },
] as const;

function Sidebar({ current, navigate, user }: { current: Screen; navigate: (s: Screen) => void; user: { name: string; email: string } }) {
  return (
    <aside
      className="hidden lg:flex flex-col w-60 border-r shrink-0"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 px-5 h-20 border-b" style={{ borderColor: 'var(--border)' }}>
        <BrandLogo />
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = current === id || (current === 'add-document' && id === 'documents');
          return (
            <button
              key={id}
              onClick={() => navigate(id as Screen)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? 'var(--nav-active)' : 'transparent',
                color: active ? 'var(--brand-dark)' : 'var(--muted-foreground)',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--muted)'; (e.currentTarget as HTMLElement).style.color = 'var(--foreground)'; }}
              onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted-foreground)'; } }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          );
        })}
      </nav>

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
          <ChevronIcon className="w-4 h-4 shrink-0" />
        </button>
      </div>
    </aside>
  );
}

function TopBar({ screen, user, navigate }: { screen: Screen; user: { name: string }; navigate: (s: Screen) => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const today = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date());
  const title: Record<Screen, string> = {
    home: 'Início', documents: 'Documentos', 'add-document': 'Adicionar Documento',
    medications: 'Medicamentos', reminders: 'Lembretes', dependents: 'Dependentes',
    history: 'Histórico', chat: 'Assistente IA', profile: 'Perfil',
  };

  return (
    <>
      <header
        className="flex items-center justify-between px-5 md:px-7 lg:px-8 h-20 border-b shrink-0"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-4">
          <button className="lg:hidden" onClick={() => setMobileMenuOpen(true)}>
            <MenuIcon className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
          </button>
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold" style={{ color: 'var(--brand-dark)' }}>
              {title[screen]}
            </h1>
            <span className="hidden md:inline text-xs capitalize" style={{ color: 'var(--muted-foreground)' }}>{today}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('add-document')}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-md"
            style={{ background: 'var(--primary)' }}
          >
            <PlusIcon className="w-4 h-4" />
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
          <aside
            className="absolute inset-y-0 left-0 w-72 flex flex-col shadow-xl"
            style={{ background: 'var(--card)' }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
              <BrandLogo />
              <button onClick={() => setMobileMenuOpen(false)}>
                <XIcon className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map(({ id, label, icon: Icon }) => {
                const active = screen === id;
                return (
                  <button
                    key={id}
                    onClick={() => { navigate(id as Screen); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: active ? 'var(--nav-active)' : 'transparent', color: active ? 'var(--brand-dark)' : 'var(--muted-foreground)' }}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                );
              })}
            </nav>
            <div className="px-3 pb-4">
              <button
                onClick={() => { navigate('add-document'); setMobileMenuOpen(false); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'var(--primary)' }}
              >
                <PlusIcon className="w-4 h-4" />
                Adicionar documento
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5" aria-label="SAFEpass">
      <div
        className="w-9 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--brand)' }}
      >
        <ShieldIcon className="w-4 h-4 text-white" />
      </div>
      <span
        className="text-lg tracking-tight"
        style={{ fontFamily: 'Days One, sans-serif', color: 'var(--brand-dark)' }}
      >
        SAFE<span style={{ color: 'var(--brand)' }}>pass</span>
      </span>
    </div>
  );
}

// Icons
function ShieldIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function HomeIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
}
function DocumentIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
}
function HistoryIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>;
}
function PillIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5l10-10a4.95 4.95 0 00-7-7l-10 10a4.95 4.95 0 007 7z" /><line x1="8.5" y1="8.5" x2="15.5" y2="15.5" /></svg>;
}
function BellIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>;
}
function UsersIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>;
}
function UserIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function PlusIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function MenuIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>;
}
function XIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function ChevronIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
}
function ChatIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>;
}
