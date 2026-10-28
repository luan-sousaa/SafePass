import { useState } from 'react';
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
  const [addDocumentKey, setAddDocumentKey] = useState(0);
  const [user] = useState<User>({ name: 'Ana Souza', email: 'ana@email.com' });

  // "Adicionar documento" sempre recomeça do zero, mesmo já estando na tela (ex.: no erro do OCR).
  const navigate = (s: Screen) => {
    if (s === 'add-document') setAddDocumentKey(k => k + 1);
    setScreen(s);
  };

  return (
    <div className="flex h-screen overflow-hidden p-0 lg:p-4" style={{ background: 'var(--background)' }}>
      <div
        className="flex flex-1 min-w-0 overflow-hidden lg:rounded-xl"
        style={{ background: 'var(--app-surface)', boxShadow: 'var(--shadow-app)' }}
      >
        <Sidebar current={screen} navigate={navigate} user={user} />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <TopBar screen={screen} user={user} navigate={navigate} />
          <main className={`app-main flex-1 ${screen === 'chat' ? 'overflow-hidden' : 'overflow-y-auto p-5 md:p-7 lg:p-8'}`}>
            {screen === 'home' && <HomeScreen navigate={navigate} user={user} />}
            {screen === 'documents' && <DocumentsScreen navigate={navigate} />}
            {screen === 'add-document' && <AddDocumentScreen key={addDocumentKey} navigate={navigate} />}
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
