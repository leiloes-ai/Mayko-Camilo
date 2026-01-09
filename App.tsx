import React, { useState, useContext, useEffect } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Appointments from './pages/Appointments.tsx';
import Pendent from './pages/Pendent.tsx';
import NewRequests from './pages/NewRequests.tsx';
import Users from './pages/Users.tsx';
import Settings from './pages/Settings.tsx';
import Profile from './pages/Profile.tsx';
import Reports from './pages/Reports.tsx';
import Financial from './pages/Financial.tsx';
import Notification from './components/Notification.tsx';
import { AppContext } from './contexts/AppContext.tsx';
import LoginPage from './pages/LoginPage.tsx';
import ForcePasswordChangeModal from './components/ForcePasswordChangeModal.tsx';


export type Page = 'Dashboard' | 'Agendamentos' | 'Pendências' | 'Novas Solicitações' | 'Relatórios' | 'Usuários' | 'Configurações' | 'Meu Perfil' | 'Financeiro';

const App: React.FC = () => {
  const { user, activePage, notification, clearNotification, loading } = useContext(AppContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isForcePasswordChangeOpen, setIsForcePasswordChangeOpen] = useState(false);

  useEffect(() => {
    if (user && user.forcePasswordChange) {
      setIsForcePasswordChangeOpen(true);
    } else {
      setIsForcePasswordChangeOpen(false);
    }
  }, [user]);

  const renderPage = () => {
    switch (activePage) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Agendamentos':
        return <Appointments />;
      case 'Pendências':
        return <Pendent />;
      case 'Novas Solicitações':
        return <NewRequests />;
      case 'Relatórios':
        return <Reports />;
      case 'Financeiro':
        return <Financial />;
      case 'Usuários':
        return <Users />;
      case 'Meu Perfil':
        return <Profile />;
      case 'Configurações':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-[200]">
          <div className="text-center animate-pulse">
              <div className="h-16 w-16 bg-primary-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-white animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 3v3m0 12v3M3 12h3m12 0h3" strokeLinecap="round"/></svg>
              </div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">GestorPRO</h2>
              <p className="mt-2 text-xs font-bold text-gray-500 dark:text-gray-400">Sincronizando Dados...</p>
          </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 font-sans overflow-hidden flex flex-col md:flex-row h-full w-full max-w-full">
      {isForcePasswordChangeOpen && <ForcePasswordChangeModal onClose={() => setIsForcePasswordChangeOpen(false)} />}
      
      {notification && <Notification message={notification} onClose={clearNotification} />}
      
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      
      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        <Header currentPage={activePage} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-3 sm:p-6 pb-24 md:pb-6 no-scrollbar">
          <div className="max-w-7xl mx-auto w-full">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;