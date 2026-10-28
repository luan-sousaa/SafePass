import { useState } from 'react';
import Alertas from './components/Alertas';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import HomeScreen from './screens/HomeScreen';
import DocumentsScreen from './screens/DocumentsScreen';
import AddDocumentScreen from './screens/AddDocumentScreen';
import MedicationsScreen from './screens/MedicationsScreen';
import RemindersScreen from './screens/RemindersScreen';
import DependentsScreen from './screens/DependentsScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatScreen from './screens/ChatScreen';
import type { Screen, User } from './types';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [user] = useState<User>({ name: 'Ana Souza', email: 'ana@email.com' });

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
      <Alertas />
    </div>
  );
}
