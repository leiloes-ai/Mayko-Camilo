import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import { FinancialPage } from '../types.ts';

// Import sub-pages
import FinancialDashboard from './financial/FinancialDashboard.tsx';
import Transactions from './financial/Transactions.tsx';
import AccountsPayable from './financial/AccountsPayable.tsx';
import AccountsReceivable from './financial/AccountsReceivable.tsx';
import FinancialReports from './financial/FinancialReports.tsx';
import CategoriesClients from './financial/CategoriesClients.tsx';
import Accounts from './financial/Accounts.tsx';

const Financial: React.FC = () => {
    const { user, activeFinancialPage, setActiveFinancialPage } = useContext(AppContext);

    if (!user || user.permissions.financial === 'hidden') {
        return (
            <div className="text-center p-10 bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded-r-lg">
                <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">Acesso Negado</h2>
                <p className="mt-2 text-yellow-700 dark:text-yellow-300">Você não tem permissão para visualizar esta página.</p>
            </div>
        );
    }

    const tabs: { id: FinancialPage; label: string }[] = [
        { id: 'Dashboard', label: 'Dashboard' },
        { id: 'Contas a pagar', label: 'Contas a Pagar' },
        { id: 'Contas a receber', label: 'Contas a Receber' },
        { id: 'Transações', label: 'Transações' },
        { id: 'Relatórios', label: 'Relatórios' },
        { id: 'Categorias & Clientes', label: 'Categorias & Clientes' },
        { id: 'Contas', label: 'Contas' }
    ];

    const renderFinancialPage = () => {
        switch (activeFinancialPage) {
            case 'Dashboard': return <FinancialDashboard />;
            case 'Transações': return <Transactions />;
            case 'Contas a pagar': return <AccountsPayable />;
            case 'Contas a receber': return <AccountsReceivable />;
            case 'Relatórios': return <FinancialReports />;
            case 'Categorias & Clientes': return <CategoriesClients />;
            case 'Contas': return <Accounts />;
            default: return <FinancialDashboard />;
        }
    };

    return (
        <div>
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Módulo Financeiro</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Controle suas receitas, despesas e contas.</p>
                </div>
            </div>
            
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {tabs.map(tab => (
                       <button 
                           key={tab.id} 
                           onClick={() => setActiveFinancialPage(tab.id)} 
                           className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeFinancialPage === tab.id ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:hover:text-gray-300 dark:hover:border-gray-600'}`}
                        >
                           {tab.label}
                       </button>
                    ))}
                </nav>
            </div>

            <div>
                {renderFinancialPage()}
            </div>
        </div>
    );
};

export default Financial;