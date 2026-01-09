import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import { Appointment } from '../types.ts';
import { DownloadIcon, SearchIcon } from '../components/Icons.tsx';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
    const { user, users, appointments, settings, loading, logo } = useContext(AppContext);

    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        licensePlate: '',
        requester: '',
        inspectorId: '',
        status: '',
    });
    const [filteredData, setFilteredData] = useState<Appointment[]>([]);

    const inspectors = useMemo(() => users.filter(u => u.roles.includes('inspector') || u.roles.includes('admin') || u.roles.includes('master')), [users]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleGenerateReport = () => {
        const result = appointments.filter(app => {
            const appointmentDate = new Date(app.date + 'T00:00:00');
            const startDate = filters.startDate ? new Date(filters.startDate + 'T00:00:00') : null;
            const endDate = filters.endDate ? new Date(filters.endDate + 'T00:00:00') : null;
            
            if (startDate && appointmentDate < startDate) return false;
            if (endDate && appointmentDate > endDate) return false;
            if (filters.licensePlate && !app.licensePlate.toLowerCase().includes(filters.licensePlate.toLowerCase())) return false;
            if (filters.requester && app.requester !== filters.requester) return false;
            if (filters.inspectorId && app.inspectorId !== filters.inspectorId) return false;
            if (filters.status && app.status !== filters.status) return false;

            return true;
        });
        setFilteredData(result);
    };

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', licensePlate: '', requester: '', inspectorId: '', status: '' });
        setFilteredData([]);
    };
    
    const getInspectorName = (inspectorId: string) => inspectors.find(u => u.id === inspectorId)?.name || 'N/A';
    
    const handleExportExcel = () => {
        const header = [
            [settings.appName],
            ["Relatório de Vistorias"],
            []
        ];

        const dataToExport = filteredData.map(app => ({
            'ID Vistoria': app.displayId || (app.stringId ? `#${app.stringId.slice(-6).toUpperCase()}` : app.id),
            'Solicitante': app.requester,
            'Demanda': app.demand,
            'Placa': app.licensePlate,
            'Tipo Vistoria': app.inspectionType,
            'Pátio': app.patio,
            'Data': new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR'),
            'Vistoriador': getInspectorName(app.inspectorId),
            'Status': app.status,
            'Observação': app.notes,
        }));
        
        const worksheet = utils.aoa_to_sheet(header);
        utils.sheet_add_json(worksheet, dataToExport, {
            origin: 'A4',
            skipHeader: false,
        });
        
        worksheet['!cols'] = [ { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 30 } ];

        const wb = utils.book_new();
        utils.book_append_sheet(wb, worksheet, "Relatorio");
        writeFile(wb, `Relatorio_Vistorias_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleExportPdf = () => {
        const doc = new jsPDF();
        if (logo) {
            try {
                doc.addImage(logo, 'PNG', 14, 8, 20, 20);
            } catch (e) { console.error("Error adding logo to PDF:", e); }
        }
        doc.setFontSize(18);
        doc.text(settings.appName, 40, 15);
        doc.setFontSize(12);
        doc.text("Relatório de Vistorias", 40, 22);

        const tableColumn = ["Placa", "Solicitante", "Data", "Vistoriador", "Status"];
        const tableRows: string[][] = [];
        filteredData.forEach(app => {
            tableRows.push([
                app.licensePlate,
                app.requester,
                new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR'),
                getInspectorName(app.inspectorId),
                app.status,
            ]);
        });
        
        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 35 });
        doc.save(`Relatorio_Vistorias_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    if (!user || user.permissions.reports === 'hidden') {
        return (
            <div className="text-center p-10 bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded-r-lg">
                <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">Acesso Negado</h2>
                <p className="mt-2 text-yellow-700 dark:text-yellow-300">Você não tem permissão para visualizar relatórios.</p>
            </div>
        );
    }
    
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Relatórios</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Gere relatórios customizados com base nos agendamentos.</p>
            
            <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">Filtros do Relatório</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="input-style" />
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="input-style" />
                    <input type="text" name="licensePlate" placeholder="Placa do Veículo" value={filters.licensePlate} onChange={handleFilterChange} className="input-style" />
                    <select name="requester" value={filters.requester} onChange={handleFilterChange} className="input-style">
                        <option value="">Todos Solicitantes</option>
                        {settings.requesters.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                    <select name="inspectorId" value={filters.inspectorId} onChange={handleFilterChange} className="input-style">
                        <option value="">Todos Vistoriadores</option>
                        {inspectors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="input-style">
                        <option value="">Todos os Status</option>
                        {settings.statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
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

            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Resultados ({filteredData.length})</h2>
                    {filteredData.length > 0 && (
                        <div className="flex gap-2">
                            <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg shadow hover:bg-green-700">
                                <DownloadIcon /> Excel
                            </button>
                            <button onClick={handleExportPdf} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg shadow hover:bg-red-700">
                                <DownloadIcon /> PDF
                            </button>
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-2">Placa</th>
                                <th className="px-4 py-2">Solicitante</th>
                                <th className="px-4 py-2">Data</th>
                                <th className="px-4 py-2">Vistoriador</th>
                                <th className="px-4 py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} className="text-center p-4">Carregando...</td></tr>
                            ) : filteredData.length > 0 ? (
                                filteredData.map(app => (
                                    <tr key={app.stringId} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{app.licensePlate}</td>
                                        <td className="px-4 py-2">{app.requester}</td>
                                        <td className="px-4 py-2">{new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-2">{getInspectorName(app.inspectorId)}</td>
                                        <td className="px-4 py-2">{app.status}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="text-center p-4 italic text-gray-500">Nenhum resultado encontrado. Aplique um filtro para gerar o relatório.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;