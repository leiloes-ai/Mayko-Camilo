
import React, { useState, useContext, useCallback, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import { Appointment, StagedRequest } from '../types.ts';
import { read, utils, writeFile } from 'xlsx';
import { DownloadIcon, UploadIcon, ChatIcon, DeleteIcon } from '../components/Icons.tsx';
import ConfirmationDialog from '../components/ConfirmationDialog.tsx';

const NewRequests: React.FC = () => {
  const { user, appointments, updateAppointment, batchAddAppointments, deleteAppointment, batchDeleteAppointments } = useContext(AppContext);
  
  // State for Excel import
  const [importedData, setImportedData] = useState<StagedRequest[]>([]);
  const [selectedImportRows, setSelectedImportRows] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  
  // State for approval list
  const [selectedApprovalRows, setSelectedApprovalRows] = useState<Set<string>>(new Set());

  // State for deletion
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState<string | string[] | null>(null);

  // Shared state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAdminOrMaster = useMemo(() => user?.roles.includes('master') || user?.roles.includes('admin'), [user]);

  const pendingRequests = useMemo(() => {
    if (!isAdminOrMaster) return [];
    return appointments
      .filter(app => app.status === 'Solicitado')
      .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments, isAdminOrMaster]);

  if (!user || user.permissions.newRequests === 'hidden') {
    return (
        <div className="text-center p-10 bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded-r-lg">
            <h2 className="text-xl font-bold text-yellow-800 dark:text-yellow-200">Acesso Negado</h2>
            <p className="mt-2 text-yellow-700 dark:text-yellow-300">Você não tem permissão para visualizar esta página.</p>
        </div>
    );
  }
  
  const resetErrorAndSuccess = () => {
    setError(null);
    setSuccessMessage(null);
  }

  // --- Approval & Deletion Logic ---
  const handleSelectApprovalRow = (stringId: string) => {
    setSelectedApprovalRows(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(stringId)) newSelection.delete(stringId);
        else newSelection.add(stringId);
        return newSelection;
    });
  };

  const handleSelectAllApprovals = () => {
      if (selectedApprovalRows.size === pendingRequests.length) {
          setSelectedApprovalRows(new Set());
      } else {
          setSelectedApprovalRows(new Set(pendingRequests.map(req => req.stringId!)));
      }
  };
  
  const isAllApprovalsSelected = useMemo(() => pendingRequests.length > 0 && selectedApprovalRows.size === pendingRequests.length, [pendingRequests, selectedApprovalRows]);

  const handleApproveSelected = async () => {
    if (selectedApprovalRows.size === 0) return;
    setIsProcessing(true);
    resetErrorAndSuccess();
    
    const updates = Array.from(selectedApprovalRows).map(stringId => {
        const appointmentToUpdate = appointments.find(app => app.stringId === stringId);
        if (appointmentToUpdate) {
            return updateAppointment({ ...appointmentToUpdate, status: 'Agendado' });
        }
        return Promise.resolve();
    });

    try {
        await Promise.all(updates);
        setSuccessMessage(`${selectedApprovalRows.size} solicitação(ões) aprovada(s) e enviada(s) para Agendamentos.`);
        setSelectedApprovalRows(new Set());
        setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
        console.error(err);
        setError("Erro ao aprovar as solicitações.");
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleDeleteClick = (req: Appointment) => {
    setItemsToDelete(req.stringId!);
    setIsDeleteConfirmOpen(true);
  };
  
  const handleDeleteSelectedClick = () => {
    if (selectedApprovalRows.size === 0) return;
    setItemsToDelete(Array.from(selectedApprovalRows));
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemsToDelete) return;
    setIsProcessing(true);
    resetErrorAndSuccess();

    try {
        if (Array.isArray(itemsToDelete)) {
            await batchDeleteAppointments(itemsToDelete);
            setSuccessMessage(`${itemsToDelete.length} solicitações foram excluídas com sucesso.`);
            setSelectedApprovalRows(new Set());
        } else {
            await deleteAppointment(itemsToDelete);
            setSuccessMessage('A solicitação foi excluída com sucesso.');
        }
        setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
        console.error("Erro ao excluir:", err);
        setError("Ocorreu um erro ao excluir a(s) solicitação(ões).");
    } finally {
        setIsProcessing(false);
        setIsDeleteConfirmOpen(false);
        setItemsToDelete(null);
    }
  };


  // --- Import Logic ---
  const resetImportState = () => {
    setImportedData([]);
    setSelectedImportRows(new Set());
    setFileName(null);
    resetErrorAndSuccess();
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    
    resetImportState();
    setIsProcessing(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = e.target?.result;
            const workbook = read(data, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = utils.sheet_to_json(worksheet, { raw: false }) as any[];
            
            if (json.length === 0) throw new Error("A planilha está vazia ou em um formato não reconhecido.");
            
            const normalizedJson = json.map(row => {
                const newRow: Record<string, any> = {};
                for (const key in row) {
                    newRow[key.trim().toUpperCase().replace(/\s+/g, ' ')] = row[key];
                }
                return newRow;
            });

            const expectedHeaders = ['PLACA (TUDO MAIÚSCULO)', 'SOLICITANTE', 'DEMANDA', 'TIPO DE VISTORIA', 'PATIO', 'DATA SOLICITADA'];
            const actualHeaders = Object.keys(normalizedJson[0] || {});
            const missingHeaders = expectedHeaders.filter(h => !actualHeaders.includes(h));

            if (missingHeaders.length > 0) throw new Error(`O arquivo não contém as seguintes colunas obrigatórias: ${missingHeaders.join(', ')}`);

            const mappedData: StagedRequest[] = normalizedJson.map(row => ({
                licensePlate: String(row['PLACA (TUDO MAIÚSCULO)'] || ''),
                requester: String(row['SOLICITANTE'] || ''),
                demand: String(row['DEMANDA'] || ''),
                inspectionType: String(row['TIPO DE VISTORIA'] || ''),
                description: String(row['DESCRIÇÃO DO VEÍCULO'] || row['DESCRICAO DO VEICULO'] || ''),
                patio: String(row['PATIO'] || ''),
                date: row['DATA SOLICITADA'] ? new Date(row['DATA SOLICITADA']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                notes: String(row['OBSERVAÇÕES'] || row['OBSERVACOES'] || ''),
                status: 'Solicitado',
                inspectorId: '',
            }));

            setImportedData(mappedData);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao processar o arquivo. Verifique o formato e as colunas.');
            setImportedData([]);
        } finally {
            setIsProcessing(false);
        }
    };
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-primary-500', 'bg-primary-50');
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileChange(event.dataTransfer.files[0]);
    }
  }, []);
  
  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => { event.preventDefault(); event.currentTarget.classList.add('border-primary-500', 'bg-primary-50'); };
  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => { event.currentTarget.classList.remove('border-primary-500', 'bg-primary-50'); };

  const handleSendToAppointments = async () => {
    if (selectedImportRows.size === 0) return;
    
    const appointmentsToSend = importedData.filter((_, index) => selectedImportRows.has(index));
    
    setIsProcessing(true);
    resetErrorAndSuccess();
    try {
      await batchAddAppointments(appointmentsToSend);
      setSuccessMessage(`${appointmentsToSend.length} solicitação(ões) foi/foram enviada(s) com sucesso!`);
      
      const remainingData = importedData.filter((_, index) => !selectedImportRows.has(index));
      setImportedData(remainingData);
      setSelectedImportRows(new Set());
      
      setTimeout(() => setSuccessMessage(null), 5000);

    } catch (err) {
      setError('Ocorreu um erro ao salvar os dados no banco de dados.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDownloadTemplate = () => {
    const headers = [['PLACA (TUDO MAIÚSCULO)', 'SOLICITANTE (Iniciais Maiúsculas)', 'DEMANDA', 'TIPO DE VISTORIA', 'DESCRIÇÃO DO VEÍCULO', 'PATIO', 'DATA SOLICITADA', 'OBSERVAÇÕES']];
    const worksheet = utils.aoa_to_sheet(headers);
    
    const dateCellAddress = 'G2';
    worksheet[dateCellAddress] = { t: 'n', f: 'TODAY()', z: 'dd/mm/yyyy' };
    
    const range = utils.decode_range(worksheet['!ref']);
    if (range.e.r < 1) range.e.r = 1; // Ensure range includes row 2
    worksheet['!ref'] = utils.encode_range(range);

    worksheet['!cols'] = [ { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 40 } ];
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Solicitacoes");
    writeFile(workbook, "modelo_solicitacao_vistorias.xlsx");
  };

  const handleSelectImportRow = (index: number) => {
    setSelectedImportRows(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(index)) newSelection.delete(index);
        else newSelection.add(index);
        return newSelection;
    });
  };

  const handleSelectAllImports = () => {
      if (selectedImportRows.size === importedData.length) {
          setSelectedImportRows(new Set());
      } else {
          setSelectedImportRows(new Set(importedData.map((_, index) => index)));
      }
  };

  const isAllImportsSelected = useMemo(() => importedData.length > 0 && selectedImportRows.size === importedData.length, [importedData, selectedImportRows]);

  // --- Render Functions ---
  const renderApprovalCards = () => (
    <div className="space-y-4 md:hidden">
        {pendingRequests.map(req => (
            <div key={req.stringId} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="font-bold text-gray-800 dark:text-white">{req.licensePlate}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{req.requester}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(req.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                         <input type="checkbox" checked={selectedApprovalRows.has(req.stringId!)} onChange={() => handleSelectApprovalRow(req.stringId!)} className="w-5 h-5 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"/>
                        <button onClick={() => handleDeleteClick(req)} disabled={isProcessing} className="text-red-500 hover:text-red-700 disabled:text-gray-400 p-1"><DeleteIcon /></button>
                    </div>
                </div>
            </div>
        ))}
    </div>
  );

  const renderApprovalTable = () => (
    <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" className="p-2">
                        <input type="checkbox" checked={isAllApprovalsSelected} onChange={handleSelectAllApprovals} className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
                    </th>
                    <th scope="col" className="px-4 py-2">Placa</th>
                    <th scope="col" className="px-4 py-2">Solicitante</th>
                    <th scope="col" className="px-4 py-2">Demanda</th>
                    <th scope="col" className="px-4 py-2">Data Solicitada</th>
                    <th scope="col" className="px-4 py-2">Status</th>
                    <th scope="col" className="px-4 py-2 text-center">Ações</th>
                </tr>
            </thead>
            <tbody>
                {pendingRequests.map((req) => (
                    <tr key={req.stringId} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="p-2">
                            <input type="checkbox" checked={selectedApprovalRows.has(req.stringId!)} onChange={() => handleSelectApprovalRow(req.stringId!)} className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"/>
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{req.licensePlate}</td>
                        <td className="px-4 py-2">{req.requester}</td>
                        <td className="px-4 py-2">{req.demand}</td>
                        <td className="px-4 py-2">{new Date(req.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-2">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                                Solicitado
                            </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                            <button onClick={() => handleDeleteClick(req)} disabled={isProcessing} className="text-red-500 hover:text-red-700 disabled:text-gray-400 p-1"><DeleteIcon /></button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );

  const renderApprovalSection = () => (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Aprovar Solicitações Pendentes</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{pendingRequests.length} solicitações aguardando aprovação.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                    onClick={handleDeleteSelectedClick}
                    disabled={isProcessing || selectedApprovalRows.size === 0}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-colors font-semibold disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                    <DeleteIcon /> Excluir ({selectedApprovalRows.size})
                </button>
                <button
                    onClick={handleApproveSelected}
                    disabled={isProcessing || selectedApprovalRows.size === 0}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition-colors font-semibold disabled:bg-green-300 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Processando...' : `Aprovar (${selectedApprovalRows.size})`}
                </button>
            </div>
        </div>

        {pendingRequests.length > 0 ? (
            <>
              {renderApprovalTable()}
              {renderApprovalCards()}
            </>
        ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-6">Nenhuma solicitação pendente no momento.</p>
        )}
    </div>
  );

  const renderUploadArea = () => (
    <>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Enviar Planilha Preenchida</h3>
      <div onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave} className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center transition-colors">
          <div className="mx-auto h-12 w-12 text-gray-400"><UploadIcon /></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Arraste e solte o arquivo aqui ou
              <label htmlFor="file-upload" className="font-medium text-primary-600 hover:text-primary-500 cursor-pointer"> clique para selecionar</label>
          </p>
          <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".xlsx, .xls" onChange={(e) => e.target.files && handleFileChange(e.target.files[0])} />
      </div>
    </>
  );

  const renderPreviewArea = () => (
    <>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Pré-visualização da Importação</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Arquivo: <span className="font-medium">{fileName}</span>. Selecione as solicitações que deseja enviar.
      </p>
      <div className="max-h-60 overflow-y-auto border dark:border-gray-700 rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
            <tr>
              <th scope="col" className="p-2"><input type="checkbox" checked={isAllImportsSelected} onChange={handleSelectAllImports} className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"/></th>
              <th scope="col" className="px-4 py-2">Placa</th><th scope="col" className="px-4 py-2">Solicitante</th><th scope="col" className="px-4 py-2">Demanda</th><th scope="col" className="px-4 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {importedData.map((item, index) => (
              <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="p-2"><input type="checkbox" checked={selectedImportRows.has(index)} onChange={() => handleSelectImportRow(index)} className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded"/></td>
                <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{item.licensePlate}</td>
                <td className="px-4 py-2">{item.requester}</td><td className="px-4 py-2">{item.demand}</td>
                <td className="px-4 py-2">{new Date(item.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={resetImportState} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200">Cancelar</button>
        <button onClick={handleSendToAppointments} disabled={isProcessing || selectedImportRows.size === 0} className="px-6 py-2 bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 font-semibold disabled:bg-primary-300">
          {isProcessing ? 'Enviando...' : `Enviar ${selectedImportRows.size} Solicitação(ões)`}
        </button>
      </div>
    </>
  );

  const renderImportSection = () => (
    <div className={`${isAdminOrMaster ? 'mt-10' : ''}`}>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{isAdminOrMaster ? 'Ou importe em lote via planilha' : 'Envio de Solicitações em Lote'}</h2>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Envie múltiplas vistorias de forma rápida usando um arquivo Excel.</p>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Como Funciona</h3>
                <ol className="list-decimal list-inside space-y-3 text-gray-600 dark:text-gray-300">
                    <li><strong>Baixe o modelo:</strong> Clique no botão para baixar a planilha padrão.</li>
                    <li><strong>Preencha os dados:</strong> Abra o arquivo e preencha uma linha para cada vistoria.</li>
                    <li><strong>Envie para revisão:</strong> Arraste o arquivo para a área de upload.</li>
                    <li><strong>Selecione e confirme:</strong> Marque as solicitações que deseja criar e clique em "Enviar".</li>
                </ol>
                <button onClick={handleDownloadTemplate} className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 font-semibold"><DownloadIcon /> Baixar Modelo (.xlsx)</button>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                {isProcessing && fileName && <div className="text-center text-gray-500">Processando arquivo...</div>}
                {!isProcessing && importedData.length === 0 ? renderUploadArea() : null}
                {!isProcessing && importedData.length > 0 ? renderPreviewArea() : null}
            </div>
        </div>
    </div>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Novas Solicitações</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        {isAdminOrMaster ? "Aprove novas solicitações ou importe em lote." : "Envie múltiplas solicitações de vistoria."}
      </p>

      {error && <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-sm">{error}</div>}
      {successMessage && <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-md text-sm">{successMessage}</div>}
      
      {isAdminOrMaster && renderApprovalSection()}
      {renderImportSection()}
      
      <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><ChatIcon /> Chat de Suporte</h2>
        <div className="text-center py-10 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Funcionalidade em construção.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Em breve, você poderá trocar mensagens e arquivos com a administração por aqui.</p>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message={
            Array.isArray(itemsToDelete)
            ? `Tem certeza que deseja excluir as ${itemsToDelete.length} solicitações selecionadas? Esta ação não pode ser desfeita.`
            : "Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita."
        }
      />
    </div>
  );
};

export default NewRequests;
