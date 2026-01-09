import React, { useState, useContext, useMemo, useCallback } from 'react';
import { AppContext } from '../../contexts/AppContext.tsx';
import { FinancialTransaction } from '../../types.ts';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Sector, LineChart, Line } from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, CurrencyDollarIcon, ExclamationTriangleIcon, DownloadIcon } from '../../components/Icons.tsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


// FIX: Cast Pie to `any` to bypass a TypeScript error on the 'activeIndex' prop.
const AnyPie = Pie as any;

type FilterPreset = 'thisMonth' | 'last30' | 'thisYear' | 'custom';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; colorClass: string; }> = ({ title, value, icon, colorClass }) => (
    <div className="bg-white dark:bg-gray-800/50 p-3 sm:p-4 rounded-xl shadow-md flex items-center sm:items-start gap-2 sm:gap-4 overflow-hidden">
        <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${colorClass.replace('text-', 'bg-').replace('600', '100')} dark:${colorClass.replace('text-', 'bg-').replace('600', '900/50')}`}>
            <span className={colorClass}>{icon}</span>
        </div>
        <div className="min-w-0">
            <p className="text-[10px] sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
            <p className="text-sm sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
        </div>
    </div>
);

const AlertSummaryCard: React.FC<{ title: string; count: number; totalValue: number; icon: React.ReactNode; colorClass: string; onClick: () => void; }> = ({ title, count, totalValue, icon, colorClass, onClick }) => (
    <div onClick={onClick} className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-md flex flex-col cursor-pointer hover:shadow-lg transition-shadow h-full">
        <div className="flex items-center gap-2">
            <span className={colorClass}>{icon}</span>
            <h4 className="font-semibold text-gray-700 dark:text-gray-200">{title}</h4>
        </div>
        <div className="mt-2 text-center flex-grow flex flex-col justify-center">
            <p className={`text-3xl font-bold ${colorClass}`}>{count}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Totalizando {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</p>
        </div>
    </div>
);

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * props.midAngle);
    const cos = Math.cos(-RADIAN * props.midAngle);
    const sx = cx + (outerRadius + 5) * cos;
    const sy = cy + (outerRadius + 5) * sin;
    const mx = cx + (outerRadius + 15) * cos;
    const my = cy + (outerRadius + 15) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 12;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
        <g>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
            <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 4} outerRadius={outerRadius + 6} fill={fill} />
            <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
            <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
            <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} textAnchor={textAnchor} fill={props.theme === 'dark' ? '#a0aec0' : '#4a5568'} className="text-xs font-semibold">{payload.name}</text>
            <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} dy={14} textAnchor={textAnchor} fill={props.theme === 'dark' ? '#cbd5e1' : '#1e293b'} className="text-sm font-bold">
                {`R$ ${new Intl.NumberFormat('pt-BR').format(value)}`}
            </text>
        </g>
    );
};


const FinancialDashboard: React.FC = () => {
    const { financials, theme, accounts, setActiveFinancialPage, logo, settings } = useContext(AppContext);
    
    const [filterPreset, setFilterPreset] = useState<FilterPreset>('thisMonth');
    const [customDateRange, setCustomDateRange] = useState({ 
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
    });
    const [activeIndex, setActiveIndex] = useState(0);
    const onPieEnter = useCallback((_: any, index: number) => { setActiveIndex(index); }, []);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setFilterPreset('custom');
    };

    const setPreset = (preset: FilterPreset) => {
        setFilterPreset(preset);
        const end = new Date();
        let start = new Date();
        if (preset === 'thisMonth') {
            start.setDate(1);
        } else if (preset === 'last30') {
            start.setDate(end.getDate() - 30);
        } else if (preset === 'thisYear') {
            start = new Date(end.getFullYear(), 0, 1);
        }
        setCustomDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const dashboardData = useMemo(() => {
        const startDate = new Date(customDateRange.start + 'T00:00:00');
        const endDate = new Date(customDateRange.end + 'T23:59:59');

        const allRealizedTransactions = financials
            .filter(t => !t.isPayableOrReceivable || t.status === 'Paga')
            .sort((a, b) => new Date(a.paymentDate || a.date).getTime() - new Date(b.paymentDate || b.date).getTime());

        const transactionsInPeriod = allRealizedTransactions.filter(t => {
            const transactionDate = new Date((t.paymentDate || t.date) + 'T00:00:00');
            return transactionDate >= startDate && transactionDate <= endDate;
        });

        const revenue = transactionsInPeriod.filter(t => t.type === 'Receita').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactionsInPeriod.filter(t => t.type === 'Despesa').reduce((sum, t) => sum + t.amount, 0);
        
        const totalReceivable = financials.filter(t => t.isPayableOrReceivable && t.type === 'Receita' && t.status !== 'Paga').reduce((sum, t) => sum + t.amount, 0);
        const totalPayable = financials.filter(t => t.isPayableOrReceivable && t.type === 'Despesa' && t.status !== 'Paga').reduce((sum, t) => sum + t.amount, 0);
        
        // FIX: Explicitly type the accumulator and use generic type for reduce to ensure 'acc[month]' is recognized.
        const cashFlowData = transactionsInPeriod.reduce<Record<string, { month: string; Receita: number; Despesa: number }>>((acc, t) => {
            const month = new Date((t.paymentDate || t.date) + 'T00:00:00').toLocaleDateString('pt-BR', { year: '2-digit', month: 'short' });
            if (!acc[month]) acc[month] = { month, Receita: 0, Despesa: 0 };
            if (t.type === 'Receita') acc[month].Receita += t.amount;
            else acc[month].Despesa += t.amount;
            return acc;
        }, {});

        // FIX: Explicitly type the accumulator and use generic type for reduce to prevent 'unknown' errors when accessing .value.
        const expenseDataMap = transactionsInPeriod.filter(t => t.type === 'Despesa').reduce<Record<string, { name: string; value: number }>>((acc, t) => {
            if (!acc[t.category]) acc[t.category] = { name: t.category, value: 0 };
            acc[t.category].value += t.amount;
            return acc;
        }, {});
        
        const today = new Date(); today.setHours(0,0,0,0);
        const next7days = new Date(); next7days.setDate(today.getDate() + 7);

        const overduePayables = financials.filter(t => t.isPayableOrReceivable && t.type === 'Despesa' && t.status === 'Pendente' && new Date(t.dueDate!) < today);
        const upcomingPayables = financials.filter(t => t.isPayableOrReceivable && t.type === 'Despesa' && t.status === 'Pendente' && new Date(t.dueDate!) >= today && new Date(t.dueDate!) <= next7days);
        const recentTransactions = [...transactionsInPeriod].sort((a,b) => new Date(b.paymentDate || b.date).getTime() - new Date(a.paymentDate || a.date).getTime()).slice(0, 5);

        const totalInitialAccountBalance = accounts.reduce((sum, acc) => sum + acc.initialBalance, 0);
        const balanceAtStartOfPeriod = allRealizedTransactions
            .filter(t => new Date(t.paymentDate || t.date) < startDate)
            .reduce((balance, t) => t.type === 'Receita' ? balance + t.amount : balance - t.amount, totalInitialAccountBalance);

        const dailyChanges = transactionsInPeriod.reduce((acc: Record<string, number>, t) => {
            const dateStr = (t.paymentDate || t.date);
            const change = t.type === 'Receita' ? t.amount : -t.amount;
            acc[dateStr] = (acc[dateStr] || 0) + change;
            return acc;
        }, {} as Record<string, number>);

        const balanceEvolutionData = [];
        let currentBalance = balanceAtStartOfPeriod;
        const dayIterator = new Date(startDate);
        while (dayIterator <= endDate) {
            const dateStr = dayIterator.toISOString().split('T')[0];
            currentBalance += dailyChanges[dateStr] || 0;
            balanceEvolutionData.push({ date: dayIterator.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), Saldo: currentBalance });
            dayIterator.setDate(dayIterator.getDate() + 1);
        }

        return {
            kpis: { revenue, expense, balance: revenue - expense, totalReceivable, totalPayable },
            cashFlow: Object.values(cashFlowData),
            // FIX: Explicitly cast values to avoid sorting errors on potentially unknown types.
            expenses: (Object.values(expenseDataMap) as { name: string, value: number }[]).sort((a, b) => b.value - a.value),
            upcomingPayables: { items: upcomingPayables, total: upcomingPayables.reduce((sum, t) => sum + t.amount, 0) },
            overduePayables: { items: overduePayables, total: overduePayables.reduce((sum, t) => sum + t.amount, 0) },
            recentTransactions,
            balanceEvolution: balanceEvolutionData
        };
    }, [financials, customDateRange, accounts]);

    const handleExportPdf = () => {
        if (!dashboardData) return;
        const doc = new jsPDF();
        
        if (logo) {
            try { doc.addImage(logo, 'PNG', 14, 8, 20, 20); } catch(e) { console.error("Error adding logo to PDF:", e); }
        }
        
        doc.setFontSize(18);
        doc.text(settings.appName, 40, 15);
        doc.setFontSize(12);
        doc.text("Dashboard Financeiro", 14, 35);
        doc.setFontSize(10);
        doc.text(`Período: ${new Date(customDateRange.start + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(customDateRange.end + 'T00:00:00').toLocaleDateString('pt-BR')}`, 14, 42);

        autoTable(doc, {
            startY: 50,
            head: [['Indicador', 'Valor']],
            body: [
                ['Faturamento', formatCurrency(dashboardData.kpis.revenue)],
                ['Custos', formatCurrency(dashboardData.kpis.expense)],
                ['Lucro/Prejuízo', formatCurrency(dashboardData.kpis.balance)],
                ['Total a Receber (Pendente)', formatCurrency(dashboardData.kpis.totalReceivable)],
                ['Total a Pagar (Pendente)', formatCurrency(dashboardData.kpis.totalPayable)],
                [`Contas Vencidas (${dashboardData.overduePayables.items.length})`, formatCurrency(dashboardData.overduePayables.total)],
                [`Vencimentos em 7 dias (${dashboardData.upcomingPayables.items.length})`, formatCurrency(dashboardData.upcomingPayables.total)],
            ],
            theme: 'striped'
        });

        let finalY = (doc as any).lastAutoTable.finalY;

        if (dashboardData.expenses.length > 0) {
            doc.text("Despesas por Categoria", 14, finalY + 10);
            autoTable(doc, {
                startY: finalY + 15,
                head: [['Categoria', 'Valor']],
                body: dashboardData.expenses.map(e => [e.name, formatCurrency(e.value)])
            });
        }
        
        doc.save(`Dashboard_Financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#64748b', '#06b6d4', '#ec4899'];

    const renderEmptyState = () => (
        <div className="text-center py-10 bg-white dark:bg-gray-800/50 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Sem dados financeiros</h3>
            <p className="mt-1 text-gray-500 dark:text-gray-400">Não há transações realizadas no período selecionado.</p>
        </div>
    );
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 bg-white dark:bg-gray-800/50 p-1 rounded-lg shadow-sm w-full sm:w-auto overflow-x-auto no-scrollbar">
                    {[{id: 'thisMonth', label: 'Este Mês'}, {id: 'last30', label: '30 dias'}, {id: 'thisYear', label: 'Este Ano'}].map(p => (
                        <button key={p.id} onClick={() => setPreset(p.id as FilterPreset)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${filterPreset === p.id ? 'bg-primary-500 text-white shadow' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{p.label}</button>
                    ))}
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-xs flex-1">
                        <input type="date" name="start" value={customDateRange.start} onChange={handleDateChange} className="bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:text-gray-200 w-full" />
                        <span className="text-gray-500">-</span>
                        <input type="date" name="end" value={customDateRange.end} onChange={handleDateChange} className="bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:text-gray-200 w-full" />
                    </div>
                    <button onClick={handleExportPdf} className="p-2 bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"><DownloadIcon /></button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <StatCard title="Faturamento" value={formatCurrency(dashboardData.kpis.revenue)} icon={<ArrowTrendingUpIcon/>} colorClass="text-green-600"/>
                <StatCard title="Custos" value={formatCurrency(dashboardData.kpis.expense)} icon={<ArrowTrendingDownIcon/>} colorClass="text-red-600"/>
                <StatCard title="Saldo" value={formatCurrency(dashboardData.kpis.balance)} icon={<CurrencyDollarIcon/>} colorClass={dashboardData.kpis.balance >= 0 ? "text-blue-600" : "text-red-600"}/>
                <StatCard title="A Receber" value={formatCurrency(dashboardData.kpis.totalReceivable)} icon={<ArrowTrendingUpIcon/>} colorClass="text-amber-600"/>
                <StatCard title="A Pagar" value={formatCurrency(dashboardData.kpis.totalPayable)} icon={<ArrowTrendingDownIcon/>} colorClass="text-rose-600"/>
            </div>
            
            {dashboardData.cashFlow.length === 0 && dashboardData.expenses.length === 0 ? renderEmptyState() : (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <AlertSummaryCard title="Contas Vencidas" count={dashboardData.overduePayables.items.length} totalValue={dashboardData.overduePayables.total} icon={<ExclamationTriangleIcon/>} colorClass="text-red-600" onClick={() => setActiveFinancialPage('Contas a pagar')} />
                    <AlertSummaryCard title="Vencimentos em 7 dias" count={dashboardData.upcomingPayables.items.length} totalValue={dashboardData.upcomingPayables.total} icon={<ExclamationTriangleIcon/>} colorClass="text-amber-600" onClick={() => setActiveFinancialPage('Contas a pagar')} />
                    <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-md">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Últimas Transações</h3>
                        <div className="space-y-3">{dashboardData.recentTransactions.length > 0 ? dashboardData.recentTransactions.map(t => (
                            <div key={t.stringId} className="flex justify-between items-center text-sm"><p className="text-gray-700 dark:text-gray-300 truncate pr-4">{t.description}</p><p className={`font-semibold whitespace-nowrap ${t.type === 'Receita' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(t.amount)}</p></div>
                        )) : <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma transação recente.</p>}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-md h-[300px] sm:h-[350px]">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-2 text-center text-sm sm:text-base">Evolução do Saldo</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboardData.balanceEvolution} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4a5568' : '#e2e8f0'} vertical={false} />
                            <XAxis dataKey="date" tick={{ fill: theme === 'dark' ? '#a0aec0' : '#4a5568', fontSize: 10 }} />
                            <YAxis tick={{ fill: theme === 'dark' ? '#a0aec0' : '#4a5568', fontSize: 10 }} width={45} tickFormatter={(value) => `${Number(value)/1000}k`} />
                            <Tooltip formatter={(value: any) => (typeof value === 'number' ? formatCurrency(value) : String(value))} labelFormatter={(label) => `Data: ${label}`} contentStyle={{ backgroundColor: theme === 'dark' ? '#2d3748' : '#fff', border: '1px solid #4a5568', fontSize: '12px' }}/>
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                            <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3 bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-md h-[300px] sm:h-[350px]">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-2 text-center text-sm sm:text-base">Fluxo de Caixa Mensal</h3>
                         <ResponsiveContainer width="100%" height="100%"><BarChart data={dashboardData.cashFlow} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4a5568' : '#e2e8f0'} vertical={false} />
                            <XAxis dataKey="month" tick={{ fill: theme === 'dark' ? '#a0aec0' : '#4a5568', fontSize: 10 }} />
                            <YAxis tick={{ fill: theme === 'dark' ? '#a0aec0' : '#4a5568', fontSize: 10 }} width={45} tickFormatter={(value) => `${Number(value)/1000}k`} />
                            <Tooltip formatter={(value: any) => (typeof value === 'number' ? formatCurrency(value) : String(value))} cursor={{ fill: 'rgba(128,128,128,0.1)' }} contentStyle={{backgroundColor: theme === 'dark' ? '#2d3748' : '#fff', border: '1px solid #4a5568', fontSize: '12px'}}/>
                            <Legend wrapperStyle={{ fontSize: '10px' }} />
                            <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Despesa" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        </BarChart></ResponsiveContainer>
                    </div>
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-md h-[300px] sm:h-[350px]">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-2 text-center text-sm sm:text-base">Composição de Despesas</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart><AnyPie data={dashboardData.expenses} cx="50%" cy="50%" innerRadius="45%" outerRadius="70%" fill="#8884d8" paddingAngle={5} dataKey="value" activeIndex={activeIndex} activeShape={(props: any) => renderActiveShape({...props, theme: theme})} onMouseEnter={onPieEnter}>
                                {dashboardData.expenses.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </AnyPie>
                            <Tooltip formatter={(value: any) => (typeof value === 'number' ? formatCurrency(value) : String(value))} contentStyle={{backgroundColor: theme === 'dark' ? '#2d3748' : '#fff', border: '1px solid #4a5568', fontSize: '12px'}}/>
</PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                </>
            )}
        </div>
    );
};

export default FinancialDashboard;