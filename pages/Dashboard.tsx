import React, { useContext, useMemo, useState, useCallback } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts';
import { AppointmentsIcon, CheckCircleIcon, ClockIcon, PendentIcon, PercentageIcon } from '../components/Icons.tsx';

// FIX: Cast Pie to `any` to bypass a TypeScript error on the 'activeIndex' prop. The provided type definitions for Recharts seem to be missing this prop, but it is valid at runtime. The cast allows the component to be used without compilation errors.
const AnyPie = Pie as any;

// --- Sub-components for the new Dashboard ---

const StatCard: React.FC<{ title: string; value: string | number; subtitle: string; icon: React.ReactNode; color: string; }> = ({ title, value, subtitle, icon, color }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-lg flex-1">
        <div className="flex justify-between items-start">
            <div className="flex flex-col">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <span className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</span>
            </div>
            <div className={`p-3 rounded-full bg-opacity-10 ${color}`}>
                <div className="h-6 w-6">{icon}</div>
            </div>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{subtitle}</p>
    </div>
);

const AlertCard: React.FC<{ title: string; value: number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg flex items-center">
        <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg mr-4 text-primary-500">
            {icon}
        </div>
        <div>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">{value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{title}</div>
        </div>
    </div>
);

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
    return (
        <g style={{ filter: `drop-shadow(0 4px 8px rgba(0,0,0,0.1))` }}>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 4}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                cornerRadius={5}
            />
            <text x={cx} y={cy - 5} dy={8} textAnchor="middle" fill={fill} className="text-3xl font-bold">
                {payload.value}
            </text>
            <text x={cx} y={cy + 15} dy={8} textAnchor="middle" className="text-sm fill-gray-500 dark:fill-gray-400">
                {payload.name}
            </text>
             <text x={cx} y={cy + 35} dy={8} textAnchor="middle" className="text-xs fill-gray-400 dark:fill-gray-500">
                ({(percent * 100).toFixed(1)}%)
            </text>
        </g>
    );
};

const ChartLegend: React.FC<{ data: { name: string }[], colors: string[] }> = ({ data, colors }) => (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2 text-xs">
        {data.map((entry, index) => (
            <div key={`item-${index}`} className="flex items-center">
                <span 
                    className="w-3 h-3 rounded-full mr-1.5"
                    style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-gray-600 dark:text-gray-400">{entry.name}</span>
            </div>
        ))}
    </div>
);


// --- Main Dashboard Component ---

const Dashboard: React.FC = () => {
    const { appointments, users, user, loading, pendencies, theme } = useContext(AppContext);

    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    
    const [activeIndex, setActiveIndex] = useState({ status: 0, inspector: 0 });

    const onPieEnter = useCallback((chart: 'status' | 'inspector', index: number) => {
        setActiveIndex(prev => ({ ...prev, [chart]: index }));
    }, []);


    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const filteredAppointments = useMemo(() => {
        const start = dateRange.start ? new Date(dateRange.start + 'T00:00:00') : null;
        const end = dateRange.end ? new Date(dateRange.end + 'T23:59:59') : null;
        
        if (!start || !end) return appointments;

        return appointments.filter(app => {
            const appDate = new Date(app.date + 'T00:00:00');
            return appDate >= start && appDate <= end;
        });
    }, [appointments, dateRange]);


    const stats = useMemo(() => {
        const total = filteredAppointments.length;
        const completed = filteredAppointments.filter(app => ['Concluído', 'Finalizado'].includes(app.status)).length;
        const pending = total - completed;
        const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';
        return { total, completed, pending, completionRate };
    }, [filteredAppointments]);

    const alertStats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const scheduledForToday = appointments.filter(app => app.date === today).length;
        const openPendencies = pendencies.filter(p => p.status !== 'Finalizada').length;
        return { scheduledForToday, openPendencies };
    }, [appointments, pendencies]);
    
    const recentCompleted = useMemo(() => 
        [...appointments]
            .filter(app => ['Concluído', 'Finalizado'].includes(app.status))
            .sort((a, b) => new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime())
            .slice(0, 5), 
    [appointments]);
        
    const statusData = useMemo(() => {
        const statusCount = filteredAppointments.reduce((acc, app) => {
            acc[app.status] = (acc[app.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(statusCount).map(([name, value]) => ({ name, value })).sort((a, b) => Number(b.value) - Number(a.value));
    }, [filteredAppointments]);

    const inspectorData = useMemo(() => {
        const inspectorCount = filteredAppointments.reduce((acc, app) => {
            const inspectorName = users.find(u => u.id === app.inspectorId)?.name || 'Não Atribuído';
            acc[inspectorName] = (acc[inspectorName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(inspectorCount).map(([name, value]) => ({ name, value })).sort((a, b) => Number(b.value) - Number(a.value));
    }, [filteredAppointments, users]);

    if (!user || user.permissions.dashboard === 'hidden') {
        return (
            <div className="text-center p-10 bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded-r-lg">
                <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">Acesso Negado</h2>
                <p className="mt-2 text-yellow-700 dark:text-yellow-300">Você não tem permissão para visualizar esta página.</p>
            </div>
        );
    }
    
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#64748b'];

    if (loading) return <p>Carregando dados do dashboard...</p>

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">Resumo visual das atividades no período selecionado.</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <input type="date" name="start" value={dateRange.start} onChange={handleDateChange} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                    <span className="text-gray-500">a</span>
                    <input type="date" name="end" value={dateRange.end} onChange={handleDateChange} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                        <StatCard title="Vistorias Concluídas" value={stats.completed} subtitle="Total de vistorias finalizadas" icon={<CheckCircleIcon />} color="bg-emerald-500 text-emerald-500" />
                        <StatCard title="Vistorias Pendentes" value={stats.pending} subtitle="Aguardando ou em andamento" icon={<ClockIcon />} color="bg-amber-500 text-amber-500" />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-6">
                         <StatCard title="Total de Agendamentos" value={stats.total} subtitle="Soma de todas as vistorias" icon={<AppointmentsIcon />} color="bg-sky-500 text-sky-500" />
                         <StatCard title="Taxa de Conclusão" value={`${stats.completionRate}%`} subtitle="Eficiência operacional" icon={<PercentageIcon />} color="bg-purple-500 text-purple-500" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg h-full flex flex-col">
                            <h3 className="font-semibold text-gray-800 dark:text-white text-center">Vistorias por Status</h3>
                            <div className="flex-grow w-full min-h-[200px]">
                                {statusData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <AnyPie data={statusData} cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" fill="#8884d8" paddingAngle={5} dataKey="value" activeIndex={activeIndex.status} activeShape={renderActiveShape} onMouseEnter={(_, index) => onPieEnter('status', index)}>
                                            {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={theme === 'dark' ? '#1f2937' : '#fff'} strokeWidth={2}/>)}
                                        </AnyPie>
                                    </PieChart>
                                </ResponsiveContainer>
                                ) : <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">Sem dados no período.</p>}
                            </div>
                            {statusData.length > 0 && <ChartLegend data={statusData} colors={COLORS} />}
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg h-full flex flex-col">
                            <h3 className="font-semibold text-gray-800 dark:text-white text-center">Vistorias por Vistoriador</h3>
                            <div className="flex-grow w-full min-h-[200px]">
                                {inspectorData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <AnyPie data={inspectorData} cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" fill="#8884d8" paddingAngle={5} dataKey="value" nameKey="name" activeIndex={activeIndex.inspector} activeShape={renderActiveShape} onMouseEnter={(_, index) => onPieEnter('inspector', index)}>
                                            {inspectorData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={theme === 'dark' ? '#1f2937' : '#fff'} strokeWidth={2}/>)}
                                        </AnyPie>
                                    </PieChart>
                                </ResponsiveContainer>
                                ) : <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-10">Sem dados no período.</p>}
                            </div>
                            {inspectorData.length > 0 && <ChartLegend data={inspectorData} colors={COLORS} />}
                        </div>
                    </div>
                </div>

                {/* Side content */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg space-y-4">
                        <h3 className="font-semibold text-gray-800 dark:text-white">Alertas Importantes</h3>
                        <AlertCard title="Agendamentos para Hoje" value={alertStats.scheduledForToday} icon={<AppointmentsIcon />} />
                        <AlertCard title="Pendências em Aberto" value={alertStats.openPendencies} icon={<PendentIcon />} />
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Vistorias Recentes</h3>
                        <div className="space-y-3">
                            {recentCompleted.length > 0 ? recentCompleted.map(app => (
                                <div key={app.id} className="flex justify-between items-center text-sm">
                                    <div>
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{app.licensePlate}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{app.requester}</p>
                                    </div>
                                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/50 px-2 py-1 rounded-full">
                                        {new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </span>
                                </div>
                            )) : <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nenhuma vistoria concluída recentemente.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;