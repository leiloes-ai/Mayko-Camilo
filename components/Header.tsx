
import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import { UserIcon, LogoutIcon } from './Icons.tsx';
import { Role } from '../types.ts';

interface HeaderProps {
  currentPage: string;
  onMenuClick: () => void;
}

const roleTranslations: Record<Role, string> = {
  master: 'Master',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  inspector: 'Vistoriador',
  client: 'Cliente',
};

const Header: React.FC<HeaderProps> = ({ currentPage, onMenuClick }) => {
  const { user, logout } = useContext(AppContext);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-20 flex-shrink-0 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-between px-3 sm:px-6 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300 relative z-30">
      <div className="flex items-center gap-1 sm:gap-3 min-w-0 flex-1">
          <button 
            onClick={onMenuClick} 
            className="md:hidden text-gray-600 dark:text-gray-300 flex-shrink-0 p-2 -ml-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
          </button>
          <h2 className="text-sm sm:text-2xl font-bold text-gray-800 dark:text-white truncate pr-2">{currentPage}</h2>
      </div>
      
      <div className="flex items-center ml-auto flex-shrink-0 relative" ref={dropdownRef}>
        {/* Área clicável do Perfil (Nome + Foto) */}
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 sm:gap-4 p-1 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all active:scale-95 text-left"
        >
          {/* Nome e Cargo - Agora visíveis em todos os tamanhos */}
          <div className="flex flex-col justify-center text-right min-w-0">
            <p className="text-[10px] sm:text-sm font-black text-gray-800 dark:text-white truncate max-w-[70px] xs:max-w-[120px] sm:max-w-[200px]">
              {user?.name?.split(' ')[0]} {user?.name?.split(' ')[1] || ''}
            </p>
            <p className="text-[8px] sm:text-[10px] text-gray-500 dark:text-gray-400 capitalize truncate max-w-[70px] xs:max-w-[120px] sm:max-w-[200px]">
              {user ? user.roles.map(r => roleTranslations[r])[0] : ''}
            </p>
          </div>

          <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border-2 border-primary-500/20 dark:border-primary-500/10 shadow-sm flex-shrink-0">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Foto do perfil" className="h-full w-full object-cover" />
              ) : (
                <UserIcon />
              )}
          </div>
        </button>
        
        {/* Menu Dropdown */}
        {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl py-2 ring-1 ring-black ring-opacity-5 z-50 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-150 origin-top-right">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Minha Conta</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white truncate">{user?.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
                
                <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
                >
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 mr-3 group-hover:bg-red-100 dark:group-hover:bg-red-900/40 transition-colors">
                      <LogoutIcon />
                    </div>
                    <span className="font-bold">Sair do Sistema</span>
                </button>
            </div>
        )}
      </div>
    </header>
  );
};

export default Header;
