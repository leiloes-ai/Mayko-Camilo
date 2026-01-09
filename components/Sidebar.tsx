import React, { useState, useContext, useEffect } from 'react';
import { Page } from '../App.tsx';
import { AppContext } from '../contexts/AppContext.tsx';
import { User } from '../types.ts';

// Importando SVGs como componentes React para melhor controle
import { DashboardIcon, AppointmentsIcon, PendentIcon, NewRequestIcon, UsersIcon, SettingsIcon, SunIcon, MoonIcon, ProfileIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ReportsIcon, FinancialIcon, InstallIcon } from './Icons.tsx';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const COLLAPSED_WIDTH = 72; // 72px

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const { theme, toggleTheme, user, settings, logo, activePage, setActivePage, pageNotifications, clearPageNotification } = useContext(AppContext);
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  useEffect(() => {
    const savedIsCollapsed = localStorage.getItem('sidebarIsCollapsed');

    if (savedIsCollapsed) {
        setIsCollapsed(savedIsCollapsed === 'true');
    }
  }, []);

  const toggleCollapse = () => {
      setIsCollapsed(prevState => {
          const newState = !prevState;
          localStorage.setItem('sidebarIsCollapsed', String(newState));
          return newState;
      });
  };

  const navItems: { name: Page; icon: React.ReactNode; permissionKey: keyof User['permissions'] | 'always' }[] = [
    { name: 'Dashboard', icon: <DashboardIcon />, permissionKey: 'dashboard' },
    { name: 'Agendamentos', icon: <AppointmentsIcon />, permissionKey: 'appointments' },
    { name: 'Pendências', icon: <PendentIcon />, permissionKey: 'pendencies' },
    { name: 'Novas Solicitações', icon: <NewRequestIcon />, permissionKey: 'newRequests' },
    { name: 'Relatórios', icon: <ReportsIcon />, permissionKey: 'reports' },
    { name: 'Financeiro', icon: <FinancialIcon />, permissionKey: 'financial' },
    { name: 'Usuários', icon: <UsersIcon />, permissionKey: 'users' },
    { name: 'Configurações', icon: <SettingsIcon />, permissionKey: 'settings' },
    { name: 'Meu Perfil', icon: <ProfileIcon />, permissionKey: 'always' },
  ];

  const handleNavClick = (page: Page) => {
    clearPageNotification(page);
    setActivePage(page);
    if (window.innerWidth < 768) { // md breakpoint
        setIsSidebarOpen(false); // Close sidebar on navigation on mobile
    }
  };

  if (!user) {
      return (
          <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex flex-col transition-colors duration-300">
              <div className="h-20 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
                  <h1 className="text-2xl font-bold text-primary-600 dark:text-primary-400">VistoriasPRO</h1>
              </div>
              <div className="flex-1 px-4 py-6 space-y-2 animate-pulse">
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
          </aside>
      );
  }

  // Define sidebar width dynamically
  const sidebarWidthClass = isCollapsed ? 'w-[72px]' : 'w-64';

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-50 flex-shrink-0 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex flex-col transition-[transform,width] duration-300 ease-in-out md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarWidthClass}`}
    >
        <div className={`h-20 flex items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-hidden ${isCollapsed ? 'justify-center' : 'justify-between px-4'}`}>
            <div className={`flex items-center gap-3 overflow-hidden transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                {logo && <img src={logo} alt="App Logo" className="h-10 w-auto object-contain flex-shrink-0" />}
                <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-300 truncate">{settings.appName}</h1>
            </div>
            {isCollapsed && logo && <img src={logo} alt="App Logo" className="h-10 w-auto object-contain flex-shrink-0" />}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-300 p-1">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
      <nav className={`flex-1 py-6 space-y-2 overflow-y-auto overflow-x-hidden ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {navItems.map((item) => {
            const isMaster = user.roles.includes('master');
            const permissionKey = item.permissionKey as keyof User['permissions'];
            const hasPermission = item.permissionKey === 'always' || (user.permissions && user.permissions[permissionKey] && user.permissions[permissionKey] !== 'hidden');

            if (isMaster || hasPermission) {
              return (
                <a
                  key={item.name}
                  href="#"
                  title={isCollapsed ? item.name : ''}
                  onClick={(e) => { e.preventDefault(); handleNavClick(item.name); }}
                  className={`relative flex items-center rounded-lg transition-all duration-200 ease-in-out ${isCollapsed ? 'justify-center py-3 px-3' : 'px-4 py-3'} ${
                    activePage === item.name
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className={`relative ${isCollapsed ? '' : 'mr-3'}`}>
                    {item.icon}
                    {pageNotifications[item.name] && (
                        <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800"></span>
                    )}
                  </span>
                  <span className={`whitespace-nowrap transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0 invisible' : 'w-auto opacity-100 visible'}`}>{item.name}</span>
                </a>
              );
            }
            return null;
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center justify-center p-3 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${isCollapsed ? 'px-3' : ''}`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          <span className={`ml-2 whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
        </button>
      </div>

       <div className={`p-2 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button
              onClick={toggleCollapse}
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-400 hidden md:inline-flex"
          >
              {isCollapsed ? <ChevronDoubleRightIcon /> : <ChevronDoubleLeftIcon />}
          </button>
      </div>
    </aside>
  );
};

export default Sidebar;