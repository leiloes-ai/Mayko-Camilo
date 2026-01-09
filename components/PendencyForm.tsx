
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { Pendency, PendencyStatus, User } from '../types.ts';
import { AppContext } from '../contexts/AppContext.tsx';

interface PendencyFormProps {
  pendency: Pendency | null;
  onSave: () => void;
}

const PendencyForm: React.FC<PendencyFormProps> = ({ pendency, onSave }) => {
  const { addPendency, updatePendency, users, appointments, user, settings } = useContext(AppContext);
  
  const [formData, setFormData] = useState({
    appointmentId: '',
    title: '',
    description: '',
    responsibleId: '',
    status: 'Pendente' as PendencyStatus,
  });

  const responsibleUsers = useMemo(() => {
    if (user?.roles.includes('client')) {
      // Clients can only assign pendencies to administrators or masters
      return users.filter(u => u.roles.includes('admin') || u.roles.includes('master'));
    }
    // Other roles can assign to inspectors, admins, or masters
    return users.filter(u => u.roles.includes('inspector') || u.roles.includes('admin') || u.roles.includes('master'));
  }, [user, users]);
  
  const availableStatuses: PendencyStatus[] = ['Pendente', 'Em Andamento', 'Finalizada'];
  
  const availableAppointments = useMemo(() => {
    if (!user) return [];

    if (user.roles.includes('client') && user.requesterId) {
        const clientRequester = settings.requesters.find(r => r.id === user.requesterId);
        if (clientRequester) {
            return appointments.filter(app => app.requester === clientRequester.name);
        }
        return []; // Client user but linked requester not found
    }

    // For master, admin, inspectors, return all appointments
    return appointments;
  }, [user, appointments, settings.requesters]);


  useEffect(() => {
    if (pendency) {
      setFormData({
        appointmentId: pendency.appointmentId,
        title: pendency.title,
        description: pendency.description,
        responsibleId: pendency.responsibleId,
        status: pendency.status,
      });
    } else {
      setFormData({
        appointmentId: '', title: '', description: '',
        responsibleId: '', status: 'Pendente'
      });
    }
  }, [pendency]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendency) {
      updatePendency({ ...pendency, ...formData });
    } else {
      addPendency({ ...formData, creationDate: new Date().toISOString().split('T')[0] });
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="appointmentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vistoria Associada</label>
        <select name="appointmentId" id="appointmentId" value={formData.appointmentId} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
            <option value="" disabled>Selecione uma vistoria...</option>
            {availableAppointments.map(app => (
                <option key={app.stringId} value={app.stringId!}>
                    {app.displayId || `#${app.stringId?.slice(-6).toUpperCase()}`} ({app.licensePlate} - {app.requester})
                </option>
            ))}
        </select>
      </div>
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observação (Título)</label>
        <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required spellCheck="true" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição Detalhada (Opcional)</label>
        <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={4} spellCheck="true" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="responsibleId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Responsável</label>
                <select name="responsibleId" id="responsibleId" value={formData.responsibleId} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="" disabled>Selecione um responsável</option>
                    {responsibleUsers.map((user: User) => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    {availableStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
       </div>
      <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
          <button type="button" onClick={onSave} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors">Cancelar</button>
          <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">Salvar</button>
      </div>
    </form>
  );
};

export default PendencyForm;
