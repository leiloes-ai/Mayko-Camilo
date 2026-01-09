import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import { Appointment, AppointmentStatus } from '../types.ts';
import { AddIcon, EditIcon, DeleteIcon, SearchIcon, DownloadIcon } from '../components/Icons.tsx';
import Modal from '../components/Modal.tsx';
import ConfirmationDialog from '../components/ConfirmationDialog.tsx';
import AppointmentForm from '../components/AppointmentForm.tsx';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Appointments: React.FC = () => {
  const { user, users, appointments, deleteAppointment, loading, isOnline, updateAppointment, settings } = useContext(AppContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentToAction, setAppointmentToAction] = useState<Appointment | null>(null);
  
  const [searchByDate, setSearchByDate] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  const canCreateOrDelete = user?.permissions.appointments === 'edit';
  const canUpdate = user?.permissions.appointments === 'edit' || user?.permissions.appointments === 'update';
  const canRequestNew = user?.permissions.newRequests === 'edit';
  
  const isAdminMasterOrSup = useMemo(() => user?.roles.includes('master') || user?.roles.includes('admin') || user?.roles.includes('supervisor'), [user]);
  const isPrivilegedUser = useMemo(() => isAdminMasterOrSup || user?.roles.includes('client'), [user, isAdminMasterOrSup]);

  const getInspectorName = (inspectorId: string) => {
    const inspector = users.find(u => u.id === inspectorId);
    return inspector ? inspector.name : 'N/A';
  }

  const userAppointments = useMemo(() => {
    if (!user) return [];
    
    let baseAppointments: Appointment[];

    if (isAdminMasterOrSup) {
        baseAppointments = appointments.filter(app => app.status !== 'Solicitado');
    } else {
        const visibleAppointments = new Map<string, Appointment>();

        if (user.roles.includes('client') && user.requesterId) {
            const clientRequester = settings.requesters.find(r => r.id === user.requesterId);
            if (clientRequester) {
                appointments
                    .filter(app => app.requester.toLowerCase() === clientRequester.name.toLowerCase())
                    .forEach(app => visibleAppointments.set(app.stringId!, app));
            }
        }
        
        if (user.roles.includes('inspector')) {
            appointments
                .filter(app => 
                    app.inspectorId === user.id && 
                    app.status !== 'Solicitado' && 
                    app.status !== 'Concluído' && 
                    app.status !== 'Finalizado'
                )
                .forEach(app => visibleAppointments.set(app.stringId!, app));
        }
        baseAppointments = Array.from(visibleAppointments.values());
    }
    
    let finalAppointments: Appointment[];

    if (isPrivilegedUser) {
        if (searchByDate) {
            let dateFilteredAppointments = [...baseAppointments];
            if (dateFilter.start) {
                const startDate = new Date(dateFilter.start + 'T00:00:00');
                dateFilteredAppointments = dateFilteredAppointments.filter(app => new Date(app.date + 'T00:00:00') >= startDate);
            }
            if (dateFilter.end) {
                const endDate = new Date(dateFilter.end + 'T23:59:59');
                dateFilteredAppointments = dateFilteredAppointments.filter(app => new Date(app.date + 'T00:00:00') <= endDate);
            }
            finalAppointments = dateFilteredAppointments;
        } else {
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            threeDaysAgo.setHours(0, 0, 0, 0);

            finalAppointments = baseAppointments.filter(app => {
                const isCompleted = app.status === 'Concluído' || app.status === 'Finalizado';
                if (!isCompleted) return true;
                const appDate = new Date(app.date + 'T00:00:00');
                return appDate >= threeDaysAgo;
            });
        }
    } else {
       finalAppointments = baseAppointments;
    }
    
    return finalAppointments.sort((a, b) => {
      const dateA = new Date(a.date + 'T00:00:00').getTime();
      const dateB = new Date(b.date + 'T00:00:00').getTime();
      if (dateA !== dateB) return dateA - dateB;
      const idA = a.displayId || (a.stringId ? `#${a.stringId.slice(-6).toUpperCase()}` : '');
      const idB = b.displayId || (b.stringId ? `#${b.stringId.slice(-6).toUpperCase()}` : '');
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });

  }, [user, appointments, settings.requesters, searchByDate, dateFilter, isPrivilegedUser, isAdminMasterOrSup]);
  
  const filteredAppointments = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return userAppointments.filter(app => {
        if (statusFilter !== 'Todos' && app.status !== statusFilter) return false;
        const inspectorName = getInspectorName(app.inspectorId).toLowerCase();
        const systemId = (app.stringId ? `#${app.stringId.slice(-6).toUpperCase()}` : String(app.id)).toLowerCase();
        return (
            (app.licensePlate || '').toLowerCase().includes(query) ||
            (app.description || '').toLowerCase().includes(query) ||
            (app.demand || '').toLowerCase().includes(query) ||
            (app.requester || '').toLowerCase().includes(query) ||
            (app.notes || '').toLowerCase().includes(query) ||
            (app.inspectionType || '').toLowerCase().includes(query) ||
            inspectorName.includes(query) ||
            (app.displayId || '').toLowerCase().includes(query) ||
            systemId.includes(query)
        );
    });
  }, [userAppointments, searchQuery, users, statusFilter]);

  const handleEditClick = (appointment: Appointment) => {
    setAppointmentToAction(appointment);
    setIsEditConfirmOpen(true);
  };

  const confirmEdit = () => {
    if (appointmentToAction) {
        setSelectedAppointment(appointmentToAction);
        setIsModalOpen(true);
    }
    setIsEditConfirmOpen(false);
    setAppointmentToAction(null);
  };

  const handleDeleteClick = (appointment: Appointment) => {
    setAppointmentToAction(appointment);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (appointmentToAction && appointmentToAction.stringId) {
      deleteAppointment(appointmentToAction.stringId);
    }
    setIsDeleteConfirmOpen(false);
    setAppointmentToAction(null);
  };

  const handleStatusChange = (appointment: Appointment, newStatus: AppointmentStatus) => {
    updateAppointment({ ...appointment, status: newStatus });
  };

  const handleExportExcel = () => {
    const dataToExport = filteredAppointments.map(app => ({
        'ID Vistoria': app.displayId || (app.stringId ? `#${app.stringId.slice(-6).toUpperCase()}` : app.id),
        'Solicitante': app.requester,
        'Demanda': app.demand,
        'Placa': app.licensePlate,
        'Descrição': app.description,
        'Tipo Vistoria': app.inspectionType,
        'Pátio': app.patio,
        'Data': new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR'),
        'Vistoriador': getInspectorName(app.inspectorId),
        'Status': app.status,
        'Observações': app.notes || ''
    }));
    const worksheet = utils.json_to_sheet(dataToExport);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Agendamentos");
    writeFile(workbook, `Vistorias_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPdf = () => {
      const doc = new jsPDF();
      doc.text(settings.appName, 14, 15);
      const tableRows = filteredAppointments.map(app => [
          app.displayId || app.licensePlate,
          app.requester,
          new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR'),
          app.status
      ]);
      autoTable(doc, { head: [['ID/Placa', 'Solicitante', 'Data', 'Status']], body: tableRows, startY: 25 });
      doc.save(`Vistorias_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Solicitado': return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
      case 'Agendado': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      case 'Em Andamento': return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300';
      case 'Concluído': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'Pendente': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'Finalizado': return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const renderMobileCards = () => (
    <div className="flex flex-col gap-4 lg:hidden w-full pb-20">
        {filteredAppointments.map(app => (
            <div key={app.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">
                            {app.displayId || `#${app.stringId?.slice(-6).toUpperCase()}`}
                        </span>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">{app.licensePlate}</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Data</p>
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
                
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Solicitante</p>
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight whitespace-normal">{app.requester}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Demanda</p>
                            <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase leading-tight whitespace-normal">{app.demand}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-50 dark:border-gray-700/50 pt-2">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Tipo</p>
                            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight whitespace-normal">{app.inspectionType}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pátio</p>
                            <p className="text-xs font-medium text-gray-500 italic leading-tight whitespace-normal">{app.patio}</p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-gray-50 dark:border-gray-700/50">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vistoriador</p>
                        <p className="text-xs font-black text-primary-700 dark:text-primary-400 uppercase">{getInspectorName(app.inspectorId)}</p>
                    </div>

                    <div className="p-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Descrição</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 font-medium whitespace-normal">{app.description || "Nenhuma descrição."}</p>
                    </div>

                    {app.notes && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-900/50">
                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Observações</p>
                            <p className="text-xs text-amber-800 dark:text-amber-400 font-bold italic whitespace-normal">{app.notes}</p>
                        </div>
                    )}

                    <div className="pt-2 border-t border-gray-50 dark:border-gray-700/50">
                        <select
                            value={app.status}
                            onChange={(e) => handleStatusChange(app, e.target.value as AppointmentStatus)}
                            disabled={!canUpdate}
                            className={`w-full p-3 text-sm font-black rounded-2xl border-0 appearance-none text-center shadow-inner transition-all ${getStatusColor(app.status)}`}
                        >
                            {settings.statuses.map(s => <option key={s.id} value={s.name}>{s.name.toUpperCase()}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={() => handleEditClick(app)} disabled={!canUpdate} className="flex-1 flex items-center justify-center gap-2 p-3 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-2xl font-black text-xs uppercase active:scale-95 transition-transform">
                            <EditIcon /> Editar
                        </button>
                        <button onClick={() => handleDeleteClick(app)} disabled={!canCreateOrDelete} className="flex-1 flex items-center justify-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-2xl font-black text-xs uppercase active:scale-95 transition-transform">
                            <DeleteIcon /> Excluir
                        </button>
                    </div>
                </div>
            </div>
        ))}
    </div>
  );

  const renderDesktopTable = () => (
    <div className="overflow-x-hidden hidden lg:block rounded-xl border border-gray-100 dark:border-gray-700/50">
        <table className="w-full text-[10px] text-left border-collapse table-fixed">
          <thead className="text-[9px] text-white uppercase bg-primary-600 sticky top-0 z-10">
            <tr>
              <th className="p-2 font-black w-[4%] text-center">ID</th>
              <th className="p-2 font-black w-[6%]">Data</th>
              <th className="p-2 font-black w-[7%]">Placa</th>
              <th className="p-2 font-black w-[11%]">Descrição</th>
              <th className="p-2 font-black w-[9%]">Solicitante</th>
              <th className="p-2 font-black w-[8%]">Demanda</th>
              <th className="p-2 font-black w-[13%]">Tipo de Vistoria</th>
              <th className="p-2 font-black w-[11%]">Pátio</th>
              <th className="p-2 font-black w-[9%]">Obs.</th>
              <th className="p-2 font-black w-[10%]">Vistoriador</th>
              <th className="p-2 font-black w-[9%]">Status</th>
              <th className="p-2 font-black text-center w-[4%]">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {filteredAppointments.map(app => (
              <tr key={app.id} className="bg-white dark:bg-gray-800 hover:bg-primary-50/20 dark:hover:bg-primary-900/10 transition-colors group">
                <td className="p-2 font-mono text-[8px] text-gray-400 font-bold truncate text-center" title={app.displayId || `#${app.stringId?.slice(-6).toUpperCase()}`}>{app.displayId || `#${app.stringId?.slice(-4).toUpperCase()}`}</td>
                <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-400 font-bold">{new Date(app.date + 'T00:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</td>
                <td className="p-2">
                    <span className="font-black text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-[9px] block text-center truncate">{app.licensePlate}</span>
                </td>
                <td className="p-2">
                    <div className="font-medium text-gray-600 dark:text-gray-300 truncate" title={app.description}>{app.description}</div>
                </td>
                <td className="p-2 font-bold text-gray-700 dark:text-gray-200 truncate" title={app.requester}>{app.requester}</td>
                <td className="p-2">
                    <div className="font-bold text-gray-600 dark:text-gray-400 uppercase whitespace-normal break-words leading-tight" title={app.demand}>{app.demand}</div>
                </td>
                <td className="p-2 text-gray-700 dark:text-gray-200 truncate font-bold" title={app.inspectionType}>{app.inspectionType}</td>
                <td className="p-2 text-gray-500 italic truncate" title={app.patio}>{app.patio}</td>
                <td className="p-2">
                    <div className="italic text-amber-600 dark:text-amber-400 truncate text-[9px]" title={app.notes || 'Sem observações'}>{app.notes || '---'}</div>
                </td>
                <td className="p-2 whitespace-nowrap font-bold text-gray-700 dark:text-gray-300 truncate text-[9px]" title={getInspectorName(app.inspectorId)}>{getInspectorName(app.inspectorId)}</td>
                <td className="p-2">
                  <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app, e.target.value as AppointmentStatus)}
                      disabled={!canUpdate}
                      className={`w-full p-1 text-[8px] font-black rounded border-0 focus:ring-1 focus:ring-primary-500 cursor-pointer shadow-sm appearance-none text-center truncate ${getStatusColor(app.status)}`}
                  >
                      {settings.statuses.map(s => <option key={s.id} value={s.name}>{s.name.toUpperCase()}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => handleEditClick(app)} disabled={!canUpdate} className="text-primary-500 hover:scale-110 transition-transform"><EditIcon /></button>
                    <button onClick={() => handleDeleteClick(app)} disabled={!canCreateOrDelete} className="text-red-500 hover:scale-110 transition-transform"><DeleteIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-8 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white tracking-tighter">Agendamentos</h1>
            {!isOnline && <span className="px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-black rounded-full animate-pulse uppercase tracking-widest">Offline</span>}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium italic">Painel de controle técnico e operacional das vistorias.</p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-3 w-full sm:w-auto">
          {isPrivilegedUser && (
              <div className="flex justify-start sm:justify-end gap-2 overflow-x-auto no-scrollbar pb-1">
                  <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-4 py-2.5 text-xs bg-emerald-600 text-white rounded-2xl shadow-lg hover:bg-emerald-700 transition-all font-black uppercase tracking-tighter"><DownloadIcon /> Excel</button>
                  <button onClick={handleExportPdf} className="flex items-center gap-1.5 px-4 py-2.5 text-xs bg-rose-600 text-white rounded-2xl shadow-lg hover:bg-rose-700 transition-all font-black uppercase tracking-tighter"><DownloadIcon /> PDF</button>
              </div>
          )}
          {canCreateOrDelete ? (
            <button onClick={() => { setSelectedAppointment(null); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-600 text-white rounded-2xl shadow-xl hover:bg-primary-700 transition-all font-black text-sm active:scale-95 group">
              <AddIcon /> <span className="group-hover:translate-x-1 transition-transform">NOVO AGENDAMENTO</span>
            </button>
          ) : canRequestNew && (
            <button onClick={() => { setSelectedAppointment(null); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-600 text-white rounded-2xl shadow-xl hover:bg-primary-700 transition-all font-black text-sm active:scale-95 group">
              <AddIcon /> <span className="group-hover:translate-x-1 transition-transform">SOLICITAR VISTORIA</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700/50 w-full overflow-hidden">
        <div className="flex flex-col gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="relative w-full">
                <input type="text" placeholder="Busque por placa, descrição, demanda..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} spellCheck="true" className="w-full pl-12 sm:pl-14 pr-6 py-3.5 sm:py-4 text-sm sm:text-base border-0 bg-gray-50 dark:bg-gray-900/50 rounded-2xl focus:ring-2 focus:ring-primary-500 shadow-inner dark:text-white placeholder-gray-400 font-medium" />
                <div className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 sm:w-6 sm:h-6"><SearchIcon /></div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full sm:w-1/3 px-5 py-3.5 text-sm font-black border-0 bg-gray-50 dark:bg-gray-900/50 rounded-2xl focus:ring-2 focus:ring-primary-500 transition-all text-gray-700 dark:text-gray-200">
                    <option value="Todos">TODOS OS STATUS</option>
                    {settings.statuses.filter(s => s.name !== 'Solicitado' || isAdminMasterOrSup).map(s => <option key={s.id} value={s.name}>{s.name.toUpperCase()}</option>)}
                </select>
                
                {isPrivilegedUser && (
                    <div className="flex flex-grow items-center gap-4 px-5 py-3.5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl overflow-hidden border-0">
                        <input type="checkbox" id="searchByDate" checked={searchByDate} onChange={(e) => setSearchByDate(e.target.checked)} className="h-6 w-6 rounded-lg border-gray-300 text-primary-600 focus:ring-primary-500 flex-shrink-0 transition-all cursor-pointer"/>
                        <label htmlFor="searchByDate" className="text-[10px] font-black text-gray-500 dark:text-gray-400 whitespace-nowrap cursor-pointer uppercase tracking-widest">Filtrar Período</label>
                        <div className={`flex items-center gap-2 flex-grow transition-all ${searchByDate ? 'opacity-100 translate-x-0' : 'opacity-20 translate-x-2 pointer-events-none'}`}>
                            <input type="date" name="start" value={dateFilter.start} onChange={(e) => setDateFilter(p => ({...p, start: e.target.value}))} className="w-full bg-transparent border-none p-0 text-xs font-black focus:ring-0 text-gray-700 dark:text-gray-200" />
                            <span className="text-gray-300 font-black">/</span>
                            <input type="date" name="end" value={dateFilter.end} onChange={(e) => setDateFilter(p => ({...p, end: e.target.value}))} className="w-full bg-transparent border-none p-0 text-xs font-black focus:ring-0 text-gray-700 dark:text-gray-200" />
                        </div>
                    </div>
                )}
            </div>
        </div>

        {loading ? <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent shadow-xl"></div></div> : (
            <div className="w-full min-w-0">
                {renderDesktopTable()}
                {renderMobileCards()}
                {filteredAppointments.length === 0 && <div className="text-center py-32"><div className="mx-auto w-16 h-16 text-gray-200 mb-4"><SearchIcon /></div><p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum agendamento localizado.</p></div>}
            </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedAppointment ? 'Editar Vistoria' : (canCreateOrDelete ? 'Nova Vistoria' : 'Solicitar Nova Vistoria')}>
        <AppointmentForm appointment={selectedAppointment} onSave={() => setIsModalOpen(false)} />
      </Modal>

      <ConfirmationDialog isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={confirmDelete} title="Excluir Registro" message="Tem certeza que deseja excluir permanentemente este agendamento?"/>
      <ConfirmationDialog isOpen={isEditConfirmOpen} onClose={() => setIsEditConfirmOpen(false)} onConfirm={confirmEdit} title="Editar Registro" message="Deseja abrir o formulário de edição?" confirmButtonColor="blue" />
    </>
  );
};

export default Appointments;