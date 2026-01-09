import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext.tsx';
import { FinancialTransaction } from '../../types.ts';
import { DownloadIcon, SearchIcon } from '../../components/Icons.tsx';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StatCard: React.FC<{ title: string; value: string; color?: string; }> = ({ title, value, color = 'text-gray-900 dark:white' }) => (
    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
);

const FinancialReports: React.FC = () => {
    // CORREÇÃO: Adicionado 'users' ao destructuring abaixo
    const { financials, settings, accounts, thirdParties, theme, logo, users, loading } = useContext(AppContext);

    const [filters, setFilters] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        type: 'Todos',
        categoryId: '',
        accountId: '',
        thirdPartyId: '',
    });
    
    const [reportData, setReportData] = useState<{
        transactions: FinancialTransaction[];
        summary: { revenue: number; expense: number; balance: number };
        cashFlow: { month: string; Receita: number; Despesa: number }[];
        expenseByCategory: { name: string; value: number }[];
    } | null>(null);

    const inspectors = useMemo(() => users.filter(u => u.roles.includes('inspector') || u.roles.includes('admin') || u.roles.includes('master')), [users]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateReport = () => {
        const realizedTransactions = financials.filter(t => !t.isPayableOrReceivable || t.status === 'Paga');
        
        const result = realizedTransactions.filter(t => {
            const transactionDate = new Date(t.date + 'T00:00:00');
            const startDate = filters.startDate ? new Date(filters.startDate + 'T00:00:00') : null;
            const endDate = filters.endDate ? new Date(filters.endDate + 'T23:59:59') : null;
            
            if (startDate && transactionDate < startDate) return false;
            if (endDate && transactionDate > endDate) return false;
            if (filters.type !== 'Todos' && t.type !== filters.type) return false;
            if (filters.categoryId && t.category !== settings.financialCategories.find(c=>c.id === filters.categoryId)?.name) return false;
            if (filters.accountId && t.accountId !== filters.accountId) return false;
            if (filters.thirdPartyId && t.thirdPartyId !== filters.thirdPartyId) return false;

            return true;
        }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const revenue = result.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.amount, 0);
        const expense = result.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.amount, 0);
        
        const cashFlowDataMap = result.reduce<Record<string, { month: string; Receita: number; Despesa: number }>>((acc, t) => {
            const month = new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR', { year: '2-digit', month: 'short' });
            if (!acc[month]) acc[month] = { month, Receita: 0, Despesa: 0 };
            if (t.type === 'Receita') acc[month].Receita += t.amount;
            else acc[month].Despesa += t.amount;
            return acc;
        }, {});
        
        const expenseByCategoryDataMap = result.filter(t => t.type === 'Despesa').reduce<Record<string, { name: string; value: number }>>((acc, t) => {
            if (!acc[t.category]) acc[t.category] = { name: t.category, value: 0 };
            acc[t.category].value += t.amount;
            return acc;
        }, {});

        setReportData({
            transactions: result,
            summary: { revenue, expense, balance: revenue - expense },
            cashFlow: Object.values(cashFlowDataMap),
            expenseByCategory: (Object.values(expenseByCategoryDataMap) as { name: string, value: number }[]).sort((a,b) => b.value - a.value),
        });
    };
    
    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', type: 'Todos', categoryId: '', accountId: '', thirdPartyId: '' });
        setReportData(null);
    };

    const handleExportExcel = () => {
        if (!reportData) return;
        const summaryData = [
            { A: settings.appName },
            { A: 'RELATÓRIO FINANCEIRO' },
            {},
            { A: 'Período de', B: `${new Date(filters.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(filters.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}` },
            {},
            { A: 'Total de Receitas', B: reportData.summary.revenue },
            { A: 'Total de Despesas', B: reportData.summary.expense },
            { A: 'Saldo Final', B: reportData.summary.balance },
            {},
            { A: 'TRANSAÇÕES' },
        ];
        const transactionsData = reportData.transactions.map(t => ({
            'Data': new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR'),
            'Descrição': t.description,
            'Tipo': t.type,
            'Categoria': t.category,
            'Conta': accounts.find(a => a.stringId === t.accountId)?.name || 'N/A',
            'Cliente/Fornecedor': thirdParties.find(tp => tp.stringId === t.thirdPartyId)?.name || 'N/A',
            'Valor': t.amount
        }));

        const ws = utils.json_to_sheet(summaryData, { skipHeader: true });
        utils.sheet_add_json(ws, transactionsData, { origin: 'A11' });
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, "Relatorio");
        writeFile(wb, `Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!reportData) return;
        const doc = new jsPDF();

        if (logo) {
            try { doc.addImage(logo, 'PNG', 14, 8, 20, 20); } catch(e) { console.error(e); }
        }
        doc.setFontSize(18);
        doc.text(settings.appName, 40, 15);
        doc.setFontSize(12);
        doc.text("Relatório Financeiro", 14, 35);
        doc.setFontSize(10);
        doc.text(`Período: ${new Date(filters.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(filters.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}`, 14, 42);

        autoTable(doc, {
            startY: 50,
            body: [
                ['Total de Receitas', formatCurrency(reportData.summary.revenue)],
                ['Total de Despesas', formatCurrency(reportData.summary.expense)],
                ['Saldo Final', formatCurrency(reportData.summary.balance)],
            ],
            theme: 'striped'
        });
        
        const tableColumn = ["Data", "Descrição", "Tipo", "Valor"];
        const tableRows = reportData.transactions.map(t => [
            new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR'),
            t.description,
            t.type,
            formatCurrency(t.amount)
        ]);
        
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: (doc as any).lastAutoTable.finalY + 10,
        });

        doc.save(`Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#64748b', '#06b6d4', '#ec4899'];

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Relatórios Financeiros</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Gere relatórios customizados com base nas transações.</p>
            
            <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Filtros do Relatório</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="input-style" />
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="input-style" />
                    <select name="type" value={filters.type} onChange={handleFilterChange} className="input-style">
                        <option value="Todos">Todos os Tipos</option>
                        <option value="Receita">Receita</option>
                        <option value="Despesa">Despesa</option>
                    </select>
                    <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} className="input-style">
                        <option value="">Todas as Categorias</option>
                        {settings.financialCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select name="accountId" value={filters.accountId} onChange={handleFilterChange} className="input-style">
                        <option value="">Todas as Contas</option>
                        {accounts.map(a => <option key={a.stringId} value={a.stringId}>{a.name}</option>)}
                    </select>
                    <select name="thirdPartyId" value={filters.thirdPartyId} onChange={handleFilterChange} className="input-style">
                        <option value="">Todos Clientes/Fornecedores</option>
                        {thirdParties.map(tp => <option key={tp.stringId} value={tp.stringId}>{tp.name}</option>)}
                    </select>
                </div>
                <div className="mt-4 flex gap-3">
                    <button onClick={handleGenerateReport} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 font-semibold">
                        <SearchIcon /> Gerar Relatório
                    </button>
                    <button onClick={clearFilters} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 font-semibold">
                        Limpar Filtros
                    </button>
                </div>
            </div>

            {reportData ? (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                             <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Resumo do Período</h2>
                             <div className="flex gap-2">
                                <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg shadow hover:bg-green-700"><DownloadIcon /> Excel</button>
                                <button onClick={handleExportPdf} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg shadow hover:bg-red-700"><DownloadIcon /> PDF</button>
                             </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <StatCard title="Total de Receitas" value={formatCurrency(reportData.summary.revenue)} color="text-green-600" />
                            <StatCard title="Total de Despesas" value={formatCurrency(reportData.summary.expense)} color="text-red-600" />
                            <StatCard title="Saldo (Lucro/Prejuízo)" value={formatCurrency(reportData.summary.balance)} color={reportData.summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg h-[350px]">
                            <h3 className="font-semibold text-gray-800 dark:text-white mb-2 text-center">Fluxo de Caixa Mensal</h3>
                            <ResponsiveContainer width="100%" height="100%"><BarChart data={reportData.cashFlow} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4a5568' : '#e2e8f0'} />
                                <XAxis dataKey="month" tick={{ fill: theme === 'dark' ? '#a0aec0' : '#4a5568', fontSize: 12 }} />
                                <YAxis tick={{ fill: theme === 'dark' ? '#a0aec0' : '#4a5568', fontSize: 12 }} tickFormatter={(value) => `R$${Number(value)/1000}k`} />
                                <Tooltip formatter={(value: any) => (typeof value === 'number' ? formatCurrency(value) : String(value))} cursor={{ fill: 'rgba(128,128,128,0.1)' }} contentStyle={{backgroundColor: theme === 'dark' ? '#2d3748' : '#fff', border: '1px solid #4a5568'}}/>
                                <Legend />
                                <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Despesa" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                            </BarChart></ResponsiveContainer>
                        </div>
                         <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg h-[350px]">
                             <h3 className="font-semibold text-gray-800 dark:text-white mb-2 text-center">Despesas por Categoria</h3>
                             <ResponsiveContainer width="100%" height="100%"><PieChart>
                                <Pie data={reportData.expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => { const radius = innerRadius + (outerRadius - innerRadius) * 1.3; const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180)); const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180)); return (<text x={x} y={y} fill={theme === 'dark' ? '#a0aec0' : '#4a5568'} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>{`${(percent * 100).toFixed(0)}%`}</text>);}}>
                                    {reportData.expenseByCategory.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value: any) => (typeof value === 'number' ? formatCurrency(value) : String(value))} contentStyle={{backgroundColor: theme === 'dark' ? '#2d3748' : '#fff', border: '1px solid #4a5568'}}/>
                                <Legend />
                             </PieChart></ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Detalhes das Transações ({reportData.transactions.length})</h2>
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0"><tr>
                                    <th className="px-4 py-2">Data</th><th className="px-4 py-2">Descrição</th><th className="px-4 py-2">Categoria</th><th className="px-4 py-2">Valor</th>
                                </tr></thead>
                                <tbody>{reportData.transactions.map(t => (
                                    <tr key={t.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-4 py-2">{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{t.description}</td>
                                        <td className="px-4 py-2">{t.category}</td>
                                        <td className={`px-4 py-2 font-semibold ${t.type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</td>
                                    </tr>))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Nenhum relatório gerado</h3>
                    <p className="mt-1 text-gray-500 dark:text-gray-400">Selecione os filtros acima e clique em "Gerar Relatório" para começar.</p>
                </div>
            )}
        </div>
    );
};

export default FinancialReports;