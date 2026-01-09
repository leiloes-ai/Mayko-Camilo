import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import { Pendency, PendencyStatus } from '../types.ts';
import { AddIcon, EditIcon, DeleteIcon, SearchIcon, DownloadIcon } from '../components/Icons.tsx';
import Modal from '../components/Modal.tsx';
import ConfirmationDialog from '../components/ConfirmationDialog.tsx';
import PendencyForm from '../components/PendencyForm.tsx';
import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Pendent: React.FC = () => {
  const { user, users, appointments, pendencies, updatePendency, deletePendency, loading, settings, logo } = useContext(AppContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedPendency, setSelectedPendency] = useState<Pendency | null>(null);
  const [pendencyToAction, setPendencyToAction] = useState<Pendency | null>(null);

  const canCreateOrDelete = user?.permissions.pendencies === 'edit';
  const canUpdate = user?.permissions.pendencies === 'edit' || user?.permissions.pendencies === 'update';

  const getResponsibleName = (userId: string) => users.find(u => u.id === userId)?.name || 'Não atribuído';
  
  const getAppointmentDetails = (appointmentId: string) => {
    const app = appointments.find(a => a.stringId === appointmentId);
    if (!app) return { licensePlate: 'N/A', requester: 'N/A', demand: 'N/A', displayId: 'N/A' };
    return {
      licensePlate: app.licensePlate,
      requester: app.requester,
      demand: app.demand,
      displayId: app.displayId || (app.stringId ? `#${app.stringId.slice(-6).toUpperCase()}` : 'N/A')
    };
  };

  const userPendencies = useMemo(() => {
    if (!user) return [];
    if (user.roles.includes('master') || user.roles.includes('admin')) {
      return pendencies;
    }

    const visiblePendencies = new Map<string, Pendency>();

    if (user.roles.includes('client') && user.requesterId) {
        const clientRequester = settings.requesters.find(r => r.id === user.requesterId);
        if (clientRequester) {
            const clientAppointmentIds = new Set(appointments.filter(a => a.requester === clientRequester.name).map(a => a.stringId).filter(id => id));
            pendencies
                .filter(p => clientAppointmentIds.has(p.appointmentId))
                .forEach(p => visiblePendencies.set(p.stringId!, p));
        }
    }

    if (user.roles.includes('inspector')) {
        pendencies
            .filter(p => p.responsibleId === user.id && p.status !== 'Finalizada')
            .forEach(p => visiblePendencies.set(p.stringId!, p));
    }

    return Array.from(visiblePendencies.values());
  }, [user, appointments, pendencies, settings.requesters]);
  
  const filteredPendencies = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return userPendencies.filter(p => {
        const responsibleName = getResponsibleName(p.responsibleId).toLowerCase();
        const details = getAppointmentDetails(p.appointmentId);
        return (
            (p.title || '').toLowerCase().includes(query) ||
            (p.description || '').toLowerCase().includes(query) ||
            responsibleName.includes(query) ||
            details.licensePlate.toLowerCase().includes(query) ||
            details.requester.toLowerCase().includes(query) ||
            details.demand.toLowerCase().includes(query) ||
            details.displayId.toLowerCase().includes(query)
        );
    });
  }, [userPendencies, searchQuery, users, appointments]);

  if (!user || user.permissions.pendencies === 'hidden') {
    return (
        <div className="text-center p-10 bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded-r-lg">
            <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-200">Acesso Negado</h2>
            <p className="mt-2 text-yellow-700 dark:text-yellow-300">Você não tem permissão para visualizar esta página.</p>
        </div>
    );
  }

  const openFormModal = (pendency: Pendency | null) => {
    setSelectedPendency(pendency);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPendency(null);
  };
  
  const handleStatusChange = (pendency: Pendency, newStatus: PendencyStatus) => {
    updatePendency({ ...pendency, status: newStatus });
  };

  const handleDeleteClick = (pendency: Pendency) => {
    setPendencyToAction(pendency);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (pendencyToAction && pendencyToAction.stringId) {
      deletePendency(pendencyToAction.stringId);
    }
    setIsDeleteConfirmOpen(false);
    setPendencyToAction(null);
  };

  const handleExportExcel = () => {
    const header = [
        [settings.appName],
        ["Relatório de Pendências"],
        []
    ];
    const dataToExport = filteredPendencies.map(p => {
        const details = getAppointmentDetails(p.appointmentId);
        return {
            'ID Vistoria': details.displayId,
            'Placa': details.licensePlate,
            'Solicitante': details.requester,
            'Demanda': details.demand,
            'Data da Pendência': new Date(p.creationDate).toLocaleDateString('pt-BR'),
            'Status': p.status,
            'Título': p.title,
            'Descrição': p.description,
            'Responsável': getResponsibleName(p.responsibleId),
        };
    });
    
    const worksheet = utils.aoa_to_sheet(header);
    utils.sheet_add_json(worksheet, dataToExport, {
        origin: 'A4',
        skipHeader: false,
    });
    
    worksheet['!cols'] = [ { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 25 } ];

    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Pendencias");
    writeFile(workbook, `Pendencias_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      doc.text("Relatório de Pendências", 40, 22);

      const tableColumn = ["ID Vistoria", "Placa", "Solicitante", "Data", "Status", "Título"];
      const tableRows: (string | number)[][] = [];
      filteredPendencies.forEach(p => {
          const details = getAppointmentDetails(p.appointmentId);
          tableRows.push([
              details.displayId,
              details.licensePlate,
              details.requester,
              new Date(p.creationDate).toLocaleDateString('pt-BR'),
              p.status,
              p.title,
          ]);
      });

      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 35 });
      doc.save(`Pendencias_${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Finalizada':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'Em Andamento':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300';
      case 'Pendente':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  const renderLoading = () => <p className="text-center py-8 text-gray-500 dark:text-gray-400">Carregando pendências...</p>;

  const renderCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {filteredPendencies.map(p => {
            const details = getAppointmentDetails(p.appointmentId);
            return (
                <div key={p.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-col justify-between border-l-4 ${p.status === 'Pendente' ? 'border-amber-500' : 'border-sky-500'}`}>
                    <div>
                        <div className="flex justify-between items-start">
                            <span className="font-bold text-lg text-gray-800 dark:text-white">{details.licensePlate}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(p.creationDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-semibold">{p.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Responsável: {getResponsibleName(p.responsibleId)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{details.requester} / {details.demand}</p>
                    </div>
                    <div className="mt-4 flex flex-col gap-3">
                         <select
                              value={p.status}
                              onChange={(e) => handleStatusChange(p, e.target.value as PendencyStatus)}
                              disabled={!canUpdate}
                              className={`w-full p-1.5 text-xs font-semibold rounded-md border-0 ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-primary-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${getStatusColor(p.status)}`}
                          >
                              <option value="Pendente">Pendente</option>
                              <option value="Em Andamento">Em Andamento</option>
                              <option value="Finalizada">Finalizada</option>
                          </select>
                        <div className="flex justify-end items-center gap-3">
                            <button onClick={() => openFormModal(p)} disabled={!canUpdate} className="text-primary-500 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"><EditIcon /></button>
                            <button onClick={() => handleDeleteClick(p)} disabled={!canCreateOrDelete} className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"><DeleteIcon /></button>
                        </div>
                    </div>
                </div>
            )
        })}
    </div>
  );

  const renderTable = () => (
    <div className="overflow-x-auto hidden md:block">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-white uppercase bg-primary-600">
              <tr>
                  <th scope="col" className="px-4 py-3">Id Vistoria</th>
                  <th scope="col" className="px-4 py-3">Placa</th>
                  <th scope="col" className="px-4 py-3">Solicitante</th>
                  <th scope="col" className="px-4 py-3">Data da Pendência</th>
                  <th scope="col" className="px-4 py-3">Título</th>
                  <th scope="col" className="px-4 py-3">Descrição</th>
                  <th scope="col" className="px-4 py-3">Responsável</th>
                  <th scope="col" className="px-2 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-center">Ações</th>
              </tr>
          </thead>
          <tbody>
              {filteredPendencies.map(p => {
                  const details = getAppointmentDetails(p.appointmentId);
                  return (
                    <tr key={p.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm">
                        <td className="px-4 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">{details.displayId}</td>
                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{details.licensePlate}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{details.requester}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{new Date(p.creationDate).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-2 whitespace-nowrap truncate max-w-xs" title={p.title}>{p.title}</td>
                        <td className="px-4 py-2 whitespace-nowrap truncate max-w-xs" title={p.description}>{p.description}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{getResponsibleName(p.responsibleId)}</td>
                        <td className="px-2 py-2 min-w-[140px]">
                          <select
                              value={p.status}
                              onChange={(e) => handleStatusChange(p, e.target.value as PendencyStatus)}
                              disabled={!canUpdate}
                              className={`w-full p-1.5 text-xs font-semibold rounded-md border-0 ring-1 ring-inset ring-transparent focus:ring-2 focus:ring-primary-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70 ${getStatusColor(p.status)}`}
                              onClick={(e) => e.stopPropagation()}
                          >
                              <option value="Pendente">Pendente</option>
                              <option value="Em Andamento">Em Andamento</option>
                              <option value="Finalizada">Finalizada</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 flex justify-center items-center gap-2">
                            <button onClick={() => openFormModal(p)} disabled={!canUpdate} className="text-primary-500 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"><EditIcon /></button>
                            <button onClick={() => handleDeleteClick(p)} disabled={!canCreateOrDelete} className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"><DeleteIcon /></button>
                        </td>
                    </tr>
                  )
              })}
          </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Pendências</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Gerencie todas as pendências das vistorias aqui.</p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
            <div className="flex justify-end gap-2">
                <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors"><DownloadIcon />Excel</button>
                <button onClick={handleExportPdf} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-colors"><DownloadIcon />PDF</button>
            </div>
            {canCreateOrDelete && (
                <button onClick={() => openFormModal(null)} className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg shadow hover:bg-primary-600 transition-colors font-semibold disabled:bg-primary-300 disabled:cursor-not-allowed"><AddIcon />Nova Pendência</button>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-lg">
          <div className="relative mb-4 md:max-w-lg">
              <input type="text" placeholder="Buscar por placa, solicitante, etc..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} spellCheck="true" className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"/>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></div>
          </div>
          {loading ? renderLoading() : (
              <>
                {renderTable()}
                {renderCards()}
                {!loading && filteredPendencies.length === 0 && <p className="text-center py-8 text-gray-500 dark:text-gray-400">Nenhuma pendência encontrada.</p>}
              </>
          )}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedPendency ? 'Editar Pendência' : 'Nova Pendência'}>
        <PendencyForm pendency={selectedPendency} onSave={handleCloseModal} />
      </Modal>

      <ConfirmationDialog isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} onConfirm={confirmDelete} title="Confirmar Exclusão" message="Tem certeza que deseja excluir esta pendência? Esta ação não pode ser desfeita."/>
    </>
  );
};

export default Pendent;