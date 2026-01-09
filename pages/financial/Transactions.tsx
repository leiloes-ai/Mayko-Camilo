import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext.tsx';
import { FinancialTransaction, FinancialTransactionType } from '../../types.ts';
import { AddIcon, EditIcon, DeleteIcon, SearchIcon, DownloadIcon } from '../../components/Icons.tsx';
import Modal from '../../components/Modal.tsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.tsx';
import FinancialForm from '../../components/FinancialForm.tsx';
import PasswordPromptModal from '../../components/PasswordPromptModal.tsx';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StatCard: React.FC<{ title: string; value: string; color: string; }> = ({ title, value, color }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg flex-1">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
);

const Transactions: React.FC = () => {
    const { user, financials, accounts, thirdParties, deleteFinancial, loading, settings, logo } = useContext(AppContext);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('Todos');
    const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);
    const [transactionToAction, setTransactionToAction] = useState<FinancialTransaction | null>(null);

    const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

    const canCreateOrDelete = user?.permissions.financial === 'edit';
    const canUpdate = user?.permissions.financial === 'edit' || user?.permissions.financial === 'update';

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const getAccountName = (accountId?: string) => accounts.find(a => a.stringId === accountId)?.name || 'N/A';
    const getThirdPartyName = (thirdPartyId?: string) => thirdParties.find(tp => tp.stringId === thirdPartyId)?.name || 'N/A';

    const filteredFinancials = useMemo(() => {
        // Show immediate transactions OR paid bills
        const transactionsToShow = financials.filter(t => !t.isPayableOrReceivable || t.status === 'Paga');
        const query = searchQuery.toLowerCase();

        return transactionsToShow.filter(t => {
            const transactionDate = new Date(t.date + 'T00:00:00');
            const startDate = dateFilter.start ? new Date(dateFilter.start + 'T00:00:00') : null;
            const endDate = dateFilter.end ? new Date(dateFilter.end + 'T23:59:59') : null;

            if (startDate && transactionDate < startDate) return false;
            if (endDate && transactionDate > endDate) return false;
            if (typeFilter !== 'Todos' && t.type !== typeFilter) return false;
            
            if (searchQuery) {
                const thirdPartyName = getThirdPartyName(t.thirdPartyId).toLowerCase();
                if (
                    !t.description.toLowerCase().includes(query) &&
                    !thirdPartyName.includes(query)
                ) {
                    return false;
                }
            }
            
            return true;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [financials, searchQuery, typeFilter, dateFilter, thirdParties]);
    
    const summary = useMemo(() => {
        const revenue = filteredFinancials.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.amount, 0);
        const expense = filteredFinancials.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.amount, 0);
        const balance = revenue - expense;
        return { revenue, expense, balance };
    }, [filteredFinancials]);

    if (!user) return null;
    
    const handleActionWithPassword = (action: () => void) => {
        setPendingAction(() => action);
        setIsPasswordPromptOpen(true);
    };

    const handlePasswordSuccess = () => {
        setIsPasswordPromptOpen(false);
        if (pendingAction) {
            pendingAction();
        }
        setPendingAction(null);
    };
    
    const openFormModal = (transaction: FinancialTransaction | null) => {
        setSelectedTransaction(transaction);
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTransaction(null);
    };
    const handleDeleteClick = (transaction: FinancialTransaction) => {
        setTransactionToAction(transaction);
        setIsDeleteConfirmOpen(true);
    };
    const confirmDelete = () => {
        if (transactionToAction && transactionToAction.stringId) {
            deleteFinancial(transactionToAction.stringId);
        }
        setIsDeleteConfirmOpen(false);
        setTransactionToAction(null);
    };

    const handleExportExcel = () => {
        const header = [
            [settings.appName],
            ["Relatório de Transações"],
            []
        ];
        const data = filteredFinancials.map(t => ({
            'Descrição': t.description,
            'Tipo': t.type,
            'Categoria': t.category,
            'Data': new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR'),
            'Valor': t.amount,
            'Conta': getAccountName(t.accountId),
            'Cliente/Fornecedor': getThirdPartyName(t.thirdPartyId),
            'Observações': t.notes || ''
        }));
        
        const ws = utils.aoa_to_sheet(header);
        utils.sheet_add_json(ws, data, { origin: 'A4', skipHeader: false });
        ws['!cols'] = [ { wch: 30 }, { wch: 10 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 25 }, { wch: 30 } ];

        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Transacoes");
        writeFile(wb, `Transacoes_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportPdf = () => {
        const doc = new jsPDF();
        if (logo) {
            try {
                doc.addImage(logo, 'PNG', 14, 8, 20, 20);
            } catch(e) { console.error("Error adding logo to PDF:", e); }
        }
        doc.setFontSize(18);
        doc.text(settings.appName, 40, 15);
        doc.setFontSize(12);
        doc.text("Relatório de Transações", 40, 22);

        const columns = ["Descrição", "Tipo", "Data", "Valor", "Cliente/Fornecedor"];
        const rows = filteredFinancials.map(t => [
            t.description,
            t.type,
            new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR'),
            formatCurrency(t.amount),
            getThirdPartyName(t.thirdPartyId)
        ]);
        
        autoTable(doc, { head: [columns], body: rows, startY: 35 });
        doc.save(`Transacoes_${new Date().toISOString().split('T')[0]}.pdf`);
    };
    
    const renderTable = () => (
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-white uppercase bg-primary-600">
                  <tr>
                      <th scope="col" className="px-6 py-3">Descrição</th>
                      <th scope="col" className="px-6 py-3">Cliente/Fornecedor</th>
                      <th scope="col" className="px-6 py-3">Data</th>
                      <th scope="col" className="px-6 py-3">Conta</th>
                      <th scope="col" className="px-6 py-3">Valor</th>
                      <th scope="col" className="px-6 py-3 text-center">Ações</th>
                  </tr>
              </thead>
              <tbody>
                  {filteredFinancials.map(t => (
                      <tr key={t.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <td className="px-6 py-4">
                            <span className="font-medium text-gray-900 dark:text-white">{t.description}</span>
                            <span className={`block text-xs font-semibold ${t.type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>{t.type}</span>
                          </td>
                          <td className="px-6 py-4">{getThirdPartyName(t.thirdPartyId)}</td>
                          <td className="px-6 py-4">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                          <td className="px-6 py-4">{getAccountName(t.accountId)}</td>
                          <td className={`px-6 py-4 font-bold ${t.type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</td>
                          <td className="px-6 py-4 flex justify-center items-center gap-3">
                              <button onClick={() => handleActionWithPassword(() => openFormModal(t))} disabled={!canUpdate} className="text-primary-500 hover:text-primary-700 disabled:text-gray-400"><EditIcon /></button>
                              <button onClick={() => handleActionWithPassword(() => handleDeleteClick(t))} disabled={!canCreateOrDelete} className="text-red-500 hover:text-red-700 disabled:text-gray-400"><DeleteIcon /></button>
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
        </div>
    );

    const renderCards = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
            {filteredFinancials.map(t => (
                <div key={t.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col justify-between border-l-4 ${t.type === 'Receita' ? 'border-green-500' : 'border-red-500'}`}>
                    <div>
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-lg text-gray-800 dark:text-white">{t.description}</span>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${t.type === 'Receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{t.type}</span>
                        </div>
                         <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{getThirdPartyName(t.thirdPartyId)}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{getAccountName(t.accountId)}</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mt-2">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                        <span className={`text-xl font-bold ${t.type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</span>
                        <div className="flex items-center gap-3">
                            <button onClick={() => handleActionWithPassword(() => openFormModal(t))} disabled={!canUpdate} className="text-primary-500 hover:text-primary-700 disabled:text-gray-400"><EditIcon /></button>
                            <button onClick={() => handleActionWithPassword(() => handleDeleteClick(t))} disabled={!canCreateOrDelete} className="text-red-500 hover:text-red-700 disabled:text-gray-400"><DeleteIcon /></button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <StatCard title="Receitas no Período" value={formatCurrency(summary.revenue)} color="text-green-600" />
                <StatCard title="Despesas no Período" value={formatCurrency(summary.expense)} color="text-red-600" />
                <StatCard title="Saldo do Período" value={formatCurrency(summary.balance)} color={summary.balance >= 0 ? 'text-gray-800 dark:text-white' : 'text-red-600'} />
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg">
                 <div className="flex flex-col lg:flex-row gap-4 mb-4 lg:items-center">
                    <div className="relative flex-grow w-full">
                        <input type="text" placeholder="Buscar por descrição, cliente, fornecedor..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                            <option value="Todos">Todos os Tipos</option>
                            <option value="Receita">Receita</option>
                            <option value="Despesa">Despesa</option>
                        </select>
                        <div className="flex items-center gap-2">
                            <input type="date" name="start" value={dateFilter.start} onChange={(e) => setDateFilter(p => ({...p, start: e.target.value}))} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm" />
                            <span className="text-gray-500 text-sm">a</span>
                            <input type="date" name="end" value={dateFilter.end} onChange={(e) => setDateFilter(p => ({...p, end: e.target.value}))} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm" />
                        </div>
                         <div className="flex justify-start sm:justify-end gap-2">
                            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg shadow hover:bg-green-700"><DownloadIcon />Excel</button>
                            <button onClick={handleExportPdf} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg shadow hover:bg-red-700"><DownloadIcon />PDF</button>
                        </div>
                         {canCreateOrDelete && (
                            <button onClick={() => openFormModal(null)} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg shadow hover:bg-primary-600 transition-colors font-semibold">
                                <AddIcon />
                                Lançamento Rápido
                            </button>
                        )}
                    </div>
                </div>

                {loading ? <p className="text-center py-8">Carregando...</p> : (
                    <>
                        {renderTable()}
                        {renderCards()}
                        {!loading && filteredFinancials.length === 0 && <p className="text-center py-8">Nenhuma transação encontrada.</p>}
                    </>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedTransaction ? 'Editar Lançamento' : 'Novo Lançamento Rápido'}>
                <FinancialForm transaction={selectedTransaction} onSave={handleCloseModal} />
            </Modal>
            
            <ConfirmationDialog isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={confirmDelete} title="Confirmar Exclusão" message="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."/>
        
            <PasswordPromptModal isOpen={isPasswordPromptOpen} onClose={() => setIsPasswordPromptOpen(false)} onSuccess={handlePasswordSuccess} />
        </>
    );
};

export default Transactions;