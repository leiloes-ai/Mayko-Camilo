import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext.tsx';
import { FinancialAccount } from '../../types.ts';
import { AddIcon, EditIcon, DeleteIcon } from '../../components/Icons.tsx';
import Modal from '../../components/Modal.tsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.tsx';
import AccountForm from '../../components/AccountForm.tsx';

const Accounts: React.FC = () => {
    const { user, accounts, financials, deleteAccount, loading } = useContext(AppContext);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
    const [accountToAction, setAccountToAction] = useState<FinancialAccount | null>(null);

    const canCreateOrDelete = user?.roles.includes('master');
    const canUpdate = user?.roles.includes('master');

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const accountsWithBalance = useMemo(() => {
        return accounts.map(account => {
            // Balance calculation should only include transactions that have actually happened:
            // 1. Immediate transactions (!isPayableOrReceivable)
            // 2. Payables/Receivables that have been marked as 'Paga'
            const transactionsForAccount = financials.filter(t => 
                t.accountId === account.stringId && (!t.isPayableOrReceivable || t.status === 'Paga')
            );

            const balance = transactionsForAccount.reduce((acc, t) => {
                return t.type === 'Receita' ? acc + t.amount : acc - t.amount;
            }, account.initialBalance);

            return { ...account, currentBalance: balance };
        });
    }, [accounts, financials]);

    const totalBalance = useMemo(() => {
        return accountsWithBalance.reduce((sum, acc) => sum + acc.currentBalance, 0);
    }, [accountsWithBalance]);

    const openFormModal = (account: FinancialAccount | null) => {
        setSelectedAccount(account);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedAccount(null);
    };

    const handleDeleteClick = (account: FinancialAccount) => {
        setAccountToAction(account);
        setIsDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (accountToAction && accountToAction.stringId) {
            const transactionsForAccount = financials.filter(t => t.accountId === accountToAction.stringId);
            if (transactionsForAccount.length > 0) {
                alert(`Não é possível excluir esta conta pois ela possui ${transactionsForAccount.length} transações associadas. Remova ou mova as transações primeiro.`);
            } else {
                deleteAccount(accountToAction.stringId);
            }
        }
        setIsDeleteConfirmOpen(false);
        setAccountToAction(null);
    };
    
    if (!user) return null;

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Saldo Consolidado</h3>
                    <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>
                        {formatCurrency(totalBalance)}
                    </p>
                </div>
                {canCreateOrDelete && (
                    <button onClick={() => openFormModal(null)} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg shadow hover:bg-primary-600 font-semibold w-full sm:w-auto">
                        <AddIcon /> Adicionar Conta
                    </button>
                )}
            </div>

            {loading ? (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">Carregando contas...</p>
            ) : accountsWithBalance.length === 0 ? (
                <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Nenhuma conta cadastrada</h3>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">Comece adicionando sua primeira conta bancária ou caixa.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accountsWithBalance.map(account => (
                        <div key={account.stringId} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg flex flex-col justify-between relative overflow-hidden">
                             <div className={`absolute left-0 top-0 bottom-0 w-2 ${account.color || 'bg-gray-300'}`}></div>
                            <div className="pl-6 pr-5 py-5">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{account.name}</h3>
                                    <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">{account.type}</span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Saldo Atual</p>
                                <p className={`text-2xl font-bold ${account.currentBalance >= 0 ? 'text-gray-800 dark:text-gray-100' : 'text-red-600'}`}>
                                    {formatCurrency(account.currentBalance)}
                                </p>
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                                    <button onClick={() => openFormModal(account)} disabled={!canUpdate} className="text-primary-500 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed">
                                        <EditIcon />
                                    </button>
                                    <button onClick={() => handleDeleteClick(account)} disabled={!canCreateOrDelete} className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed">
                                        <DeleteIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedAccount ? 'Editar Conta' : 'Nova Conta'}>
                <AccountForm account={selectedAccount} onSave={handleCloseModal} />
            </Modal>
            
            <ConfirmationDialog 
                isOpen={isDeleteConfirmOpen} 
                onClose={() => setIsDeleteConfirmOpen(false)} 
                onConfirm={confirmDelete} 
                title="Confirmar Exclusão" 
                message={`Tem certeza que deseja excluir a conta "${accountToAction?.name}"? Esta ação não pode ser desfeita.`}
            />
        </>
    );
};

export default Accounts;