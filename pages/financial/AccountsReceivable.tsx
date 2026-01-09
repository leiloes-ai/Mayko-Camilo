
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext.tsx';
import { FinancialTransaction, PayableReceivableStatus } from '../../types.ts';
import { AddIcon, EditIcon, DeleteIcon, SearchIcon } from '../../components/Icons.tsx';
import Modal from '../../components/Modal.tsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.tsx';
import PayableReceivableForm from '../../components/PayableReceivableForm.tsx';
import MarkAsPaidModal from '../../components/MarkAsPaidModal.tsx';

const StatCard: React.FC<{ title: string; value: string; color?: string; }> = ({ title, value, color = 'text-gray-800 dark:text-white' }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg flex-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
);

const AccountsReceivable: React.FC = () => {
    const { user, financials, thirdParties, deleteFinancial, loading } = useContext(AppContext);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<PayableReceivableStatus | 'Todas'>('Pendente');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isPaidModalOpen, setIsPaidModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
    const [transactionToAction, setTransactionToAction] = useState<FinancialTransaction | null>(null);

    const canCreateOrDelete = user?.permissions.financial === 'edit';
    const canUpdate = user?.permissions.financial === 'edit' || user?.permissions.financial === 'update';

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    const getThirdPartyName = (thirdPartyId?: string) => thirdParties.find(tp => tp.stringId === thirdPartyId)?.name || 'N/A';

    const receivableAccounts = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return financials
            .filter(t => t.isPayableOrReceivable && t.type === 'Receita')
            .map(t => {
                const dueDate = new Date(t.dueDate + 'T00:00:00');
                const isOverdue = t.status === 'Pendente' && dueDate < today;
                return { ...t, status: isOverdue ? 'Vencida' : t.status };
            })
            .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    }, [financials]);
    
    const filteredReceivables = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return receivableAccounts.filter(t => {
            if (statusFilter !== 'Todas' && t.status !== statusFilter) return false;
            
            if (searchQuery) {
                const thirdPartyName = getThirdPartyName(t.thirdPartyId).toLowerCase();
                 if (!t.description.toLowerCase().includes(query) && !thirdPartyName.includes(query)) {
                    return false;
                }
            }
            return true;
        });
    }, [receivableAccounts, searchQuery, statusFilter, thirdParties]);
    
    const summary = useMemo(() => {
        const totalPending = receivableAccounts.filter(t => t.status === 'Pendente').reduce((sum, t) => sum + t.amount, 0);
        const totalOverdue = receivableAccounts.filter(t => t.status === 'Vencida').reduce((sum, t) => sum + t.amount, 0);
        return { totalPending, totalOverdue };
    }, [receivableAccounts]);

    if (!user) return null;
    
    const openFormModal = (transaction: FinancialTransaction | null) => { setSelectedTransaction(transaction); setIsFormModalOpen(true); };
    const closeFormModal = () => { setIsFormModalOpen(false); setSelectedTransaction(null); };
    
    const openPaidModal = (transaction: FinancialTransaction) => { setTransactionToAction(transaction); setIsPaidModalOpen(true); };
    const closePaidModal = () => { setIsPaidModalOpen(false); setTransactionToAction(null); };
    
    const handleDeleteClick = (transaction: FinancialTransaction) => { setTransactionToAction(transaction); setIsDeleteConfirmOpen(true); };
    const confirmDelete = () => {
        // FIX: Pass the stringId to the delete function, not the numeric index-based id.
        if (transactionToAction && transactionToAction.stringId) deleteFinancial(transactionToAction.stringId);
        setIsDeleteConfirmOpen(false);
        setTransactionToAction(null);
    };

    const getStatusChip = (status: PayableReceivableStatus) => {
        const styles: Record<PayableReceivableStatus, string> = {
            'Pendente': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            'Paga': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            'Vencida': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 animate-pulse',
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };
    
    return (
        <>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <StatCard title="Total Pendente" value={formatCurrency(summary.totalPending)} />
                <StatCard title="Total Vencido" value={formatCurrency(summary.totalOverdue)} color="text-red-600" />
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
                    <div className="relative w-full md:w-auto flex-grow">
                        <input type="text" placeholder="Buscar por descrição ou cliente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></div>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                            <option value="Todas">Todos Status</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Vencida">Vencida</option>
                            <option value="Paga">Paga</option>
                        </select>
                        {canCreateOrDelete && (
                            <button onClick={() => openFormModal(null)} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg shadow hover:bg-primary-600 font-semibold whitespace-nowrap">
                                <AddIcon /> Adicionar Conta
                            </button>
                        )}
                    </div>
                </div>

                {loading ? <p className="text-center py-8">Carregando...</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Descrição</th>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">Vencimento</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Valor</th>
                                    <th className="px-6 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReceivables.map(t => (
                                    <tr key={t.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                                        <td className="px-6 py-4">{getThirdPartyName(t.thirdPartyId)}</td>
                                        <td className="px-6 py-4">{new Date(t.dueDate! + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="px-6 py-4">{getStatusChip(t.status as PayableReceivableStatus)}</td>
                                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-gray-200">{formatCurrency(t.amount)}</td>
                                        <td className="px-6 py-4 text-center">
                                            {t.status !== 'Paga' ? (
                                                <button onClick={() => openPaidModal(t)} className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-md hover:bg-green-600 mr-2">
                                                    Confirmar Recebimento
                                                </button>
                                            ) : <span className="text-xs italic mr-2">Liquidado</span>}
                                            <button onClick={() => openFormModal(t)} disabled={!canUpdate} className="p-1 text-primary-500 hover:text-primary-700 disabled:text-gray-400"><EditIcon /></button>
                                            <button onClick={() => handleDeleteClick(t)} disabled={!canCreateOrDelete} className="p-1 text-red-500 hover:text-red-700 disabled:text-gray-400"><DeleteIcon /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!loading && filteredReceivables.length === 0 && <p className="text-center py-8">Nenhuma conta a receber encontrada para os filtros selecionados.</p>}
                    </div>
                )}
            </div>

            <Modal isOpen={isFormModalOpen} onClose={closeFormModal} title={selectedTransaction ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}>
                <PayableReceivableForm transaction={selectedTransaction} type="Receita" onSave={closeFormModal} />
            </Modal>
            
            {transactionToAction && (
                 <MarkAsPaidModal isOpen={isPaidModalOpen} onClose={closePaidModal} transaction={transactionToAction} />
            )}
            
            <ConfirmationDialog isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={confirmDelete} title="Confirmar Exclusão" message="Tem certeza que deseja excluir esta conta a receber?"/>
        </>
    );
};

export default AccountsReceivable;