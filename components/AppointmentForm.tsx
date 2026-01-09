import React, { useState, useContext, useEffect, useMemo } from 'react';
import { Appointment, AppointmentStatus, User } from '../types.ts';
import { AppContext } from '../contexts/AppContext.tsx';
import ConfirmationDialog from './ConfirmationDialog.tsx';

interface AppointmentFormProps {
  appointment: Appointment | null;
  onSave: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ appointment, onSave }) => {
  const { addAppointment, updateAppointment, users, settings, appointments, user: loggedInUser } = useContext(AppContext);
  
  const isClient = useMemo(() => loggedInUser?.roles.includes('client'), [loggedInUser]);
  const linkedRequesterName = useMemo(() => {
    if (isClient && loggedInUser?.requesterId) {
        return settings.requesters.find(r => r.id === loggedInUser.requesterId)?.name || '';
    }
    return '';
  }, [isClient, loggedInUser, settings.requesters]);

  const [formData, setFormData] = useState({
    displayId: '',
    requester: '',
    demand: '',
    inspectionType: '',
    licensePlate: '',
    description: '',
    patio: '',
    date: new Date().toISOString().split('T')[0],
    inspectorId: '',
    status: 'Solicitado' as AppointmentStatus,
    notes: ''
  });

  const [isDuplicateConfirmOpen, setIsDuplicateConfirmOpen] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{ date: string } | null>(null);

  const inspectors = users.filter(u => u.roles.includes('inspector'));

  const systemId = useMemo(() => {
    if (!appointment) return "Será gerado ao salvar";
    return appointment.stringId ? `#${appointment.stringId.slice(-6).toUpperCase()}` : String(appointment.id);
  }, [appointment]);

  useEffect(() => {
    if (appointment) {
      setFormData({
        displayId: appointment.displayId || '',
        requester: appointment.requester,
        demand: appointment.demand,
        inspectionType: appointment.inspectionType,
        licensePlate: appointment.licensePlate,
        description: appointment.description || '',
        patio: appointment.patio,
        date: appointment.date,
        inspectorId: appointment.inspectorId,
        status: appointment.status,
        notes: appointment.notes
      });
    } else {
      // Reset form for new appointment
      setFormData({
        displayId: '',
        requester: isClient ? linkedRequesterName : '', 
        demand: '', 
        inspectionType: '', 
        licensePlate: '',
        description: '', 
        patio: '', 
        date: new Date().toISOString().split('T')[0], 
        inspectorId: '', 
        status: 'Solicitado', 
        notes: ''
      });
    }
  }, [appointment, isClient, linkedRequesterName]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
     if (name === 'licensePlate') {
        setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const proceedWithSave = () => {
    const dataToSave = { ...formData };
    
    // If the user types in the system ID, treat it as "use default" by saving an empty string
    if (dataToSave.displayId === systemId) {
        dataToSave.displayId = '';
    }

    if (appointment) {
      updateAppointment({ ...appointment, ...dataToSave });
    } else {
      addAppointment(dataToSave);
    }
    onSave();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only check for duplicates when creating a NEW appointment
    if (!appointment && formData.licensePlate) {
        const plate = formData.licensePlate.trim().toUpperCase();
        const newDate = new Date(formData.date + 'T00:00:00'); // Use T00:00:00 to avoid timezone issues
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

        const duplicate = appointments.find(app => {
            if (app.licensePlate.trim().toUpperCase() !== plate) return false;
            
            const existingDate = new Date(app.date + 'T00:00:00');
            const timeDiff = Math.abs(newDate.getTime() - existingDate.getTime());
            return timeDiff <= thirtyDaysInMs;
        });

        if (duplicate) {
            setDuplicateInfo({ date: new Date(duplicate.date + 'T00:00:00').toLocaleDateString('pt-BR') });
            setIsDuplicateConfirmOpen(true);
            return; // Stop and wait for user confirmation
        }
    }
    
    proceedWithSave();
  };

  const handleConfirmDuplicate = () => {
    setIsDuplicateConfirmOpen(false);
    proceedWithSave();
  };

  return (
    <>
        <form onSubmit={handleSubmit} className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {!isClient && (
                <div className="md:col-span-2">
                    <label htmlFor="displayId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">ID de Vistoria</label>
                    <input 
                        type="text" 
                        name="displayId" 
                        id="displayId" 
                        value={formData.displayId} 
                        onChange={handleChange}
                        placeholder={`Padrão: ${systemId}`}
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" 
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Deixe em branco para usar o ID do sistema ({systemId}).</p>
                </div>
            )}
            <div className="md:col-span-2">
                <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Placa do Veículo</label>
                <input 
                    type="text" 
                    name="licensePlate" 
                    id="licensePlate" 
                    value={formData.licensePlate} 
                    onChange={handleChange} 
                    required 
                    spellCheck="false" 
                    maxLength={7}
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" 
                />
            </div>
            <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                <input
                    type="text"
                    name="description"
                    id="description"
                    value={formData.description}
                    onChange={handleChange}
                    spellCheck="true"
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
            </div>
            <div>
                <label htmlFor="requester" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Solicitante</label>
                <select 
                    name="requester" 
                    id="requester" 
                    value={formData.requester} 
                    onChange={handleChange} 
                    required 
                    disabled={isClient}
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                    <option value="" disabled>Selecione...</option>
                    {settings.requesters.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
                {isClient && <p className="mt-1 text-[10px] text-primary-500 font-bold uppercase">Empresa vinculada ao seu perfil.</p>}
            </div>
            <div>
                <label htmlFor="demand" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Demanda</label>
                <select name="demand" id="demand" value={formData.demand} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="" disabled>Selecione...</option>
                    {settings.demands.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="inspectionType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Vistoria</label>
                <select name="inspectionType" id="inspectionType" value={formData.inspectionType} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="" disabled>Selecione...</option>
                    {settings.inspectionTypes.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="patio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pátio</label>
                <select name="patio" id="patio" value={formData.patio} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="" disabled>Selecione...</option>
                    {settings.patios.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data da Vistoria</label>
                <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            {!isClient && (
                <div>
                    <label htmlFor="inspectorId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vistoriador</label>
                    <select name="inspectorId" id="inspectorId" value={formData.inspectorId} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                        <option value="" disabled>Selecione um vistoriador</option>
                        {inspectors.map((inspector: User) => (
                            <option key={inspector.id} value={inspector.id}>{inspector.name}</option>
                        ))}
                    </select>
                </div>
            )}
            <div className="md:col-span-2">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select 
                    name="status" 
                    id="status" 
                    value={formData.status} 
                    onChange={handleChange} 
                    disabled={isClient}
                    className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {settings.statuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                {isClient && <p className="mt-1 text-[10px] text-amber-600 font-bold uppercase italic">A solicitação passará por análise da administração.</p>}
            </div>
            <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observação</label>
                <textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} rows={3} spellCheck="true" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onSave} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                    {isClient ? 'ENVIAR SOLICITAÇÃO' : 'SALVAR'}
                </button>
            </div>
        </form>
        <ConfirmationDialog
            isOpen={isDuplicateConfirmOpen}
            onClose={() => setIsDuplicateConfirmOpen(false)}
            onConfirm={handleConfirmDuplicate}
            title="Agendamento Duplicado?"
            message={`Já existe um agendamento para esta placa na data de ${duplicateInfo?.date}. Deseja criar um novo agendamento mesmo assim?`}
            confirmButtonColor="blue"
        />
    </>
  );
};

export default AppointmentForm;