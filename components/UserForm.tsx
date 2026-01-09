
import * as React from 'react';
import { User, Role, PermissionLevel } from '../types.ts';
import { AppContext } from '../contexts/AppContext.tsx';

interface UserFormProps {
  user: User | null;
  onSave: () => void;
}

const roleTranslations: Record<Role, string> = {
  master: 'Master',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  inspector: 'Vistoriador',
  client: 'Cliente',
};

const permissionTranslations: Record<keyof User['permissions'], string> = {
  dashboard: 'Dashboard',
  appointments: 'Agendamentos',
  pendencies: 'Pendências',
  financial: 'Financeiro',
  newRequests: 'Novas Solicitações',
  reports: 'Relatórios',
  users: 'Usuários',
  settings: 'Configurações',
};

const permissionLevels: PermissionLevel[] = ['hidden', 'view', 'update', 'edit'];
    
const calculatePermissionsForRoles = (roles: Role[]): User['permissions'] => {
    const finalPermissions: User['permissions'] = { 
        dashboard: 'hidden', appointments: 'hidden', pendencies: 'hidden', newRequests: 'hidden', reports: 'hidden', users: 'hidden', settings: 'hidden', financial: 'hidden'
    };

    const rolePermissionsMap: Record<Role, Partial<User['permissions']>> = {
        master: { dashboard: 'edit', appointments: 'edit', pendencies: 'edit', newRequests: 'edit', reports: 'edit', users: 'edit', settings: 'edit', financial: 'edit' },
        admin: { dashboard: 'edit', appointments: 'edit', pendencies: 'edit', newRequests: 'edit', reports: 'edit', users: 'edit', settings: 'edit', financial: 'edit' },
        supervisor: { dashboard: 'view', appointments: 'edit', pendencies: 'edit', newRequests: 'view', reports: 'view', users: 'hidden', settings: 'view', financial: 'hidden' },
        inspector: { dashboard: 'view', appointments: 'update', pendencies: 'update', newRequests: 'hidden', reports: 'hidden', users: 'hidden', settings: 'update', financial: 'hidden' },
        client: { dashboard: 'view', appointments: 'view', pendencies: 'view', newRequests: 'edit', reports: 'hidden', users: 'hidden', settings: 'update', financial: 'hidden' }
    };

    for (const role of roles) {
        const permissionsForRole = rolePermissionsMap[role];
        for (const key in permissionsForRole) {
            const module = key as keyof User['permissions'];
            const currentLevel = finalPermissions[module];
            const newLevel = permissionsForRole[module]!;
            if (permissionLevels.indexOf(newLevel) > permissionLevels.indexOf(currentLevel)) {
                finalPermissions[module] = newLevel;
            }
        }
    }
    return finalPermissions;
};


const UserForm: React.FC<UserFormProps> = ({ user, onSave }) => {
  const { addUser, updateUser, settings, user: loggedInUser } = React.useContext(AppContext);
  
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    roles: ['inspector'] as Role[],
    requesterId: '',
    permissions: {
      dashboard: 'view' as PermissionLevel,
      appointments: 'update' as PermissionLevel,
      pendencies: 'update' as PermissionLevel,
      newRequests: 'hidden' as PermissionLevel,
      reports: 'hidden' as PermissionLevel,
      users: 'hidden' as PermissionLevel,
      settings: 'update' as PermissionLevel,
      financial: 'hidden' as PermissionLevel,
    }
  });

  React.useEffect(() => {
    if (user) {
      let permissions = user.permissions;
      // As permissões de Master são sempre fixas e não devem ser alteradas.
      if (user.roles.includes('master')) {
        permissions = { 
          dashboard: 'edit', appointments: 'edit', pendencies: 'edit', 
          newRequests: 'edit', reports: 'edit', users: 'edit', settings: 'edit',
          financial: 'edit',
        };
      }

      setFormData({
        name: user.name,
        email: user.email,
        roles: user.roles,
        requesterId: user.requesterId || '',
        permissions: {
            ...{ 
                dashboard: 'view', appointments: 'update', pendencies: 'update', newRequests: 'hidden', reports: 'hidden', users: 'hidden', settings: 'update', financial: 'hidden'
            },
            ...permissions,
        }
      });
    } else {
      setFormData({
        name: '', email: '', roles: ['inspector'], requesterId: '',
        permissions: { 
          dashboard: 'view', appointments: 'update', pendencies: 'update',
          newRequests: 'hidden', reports: 'hidden', users: 'hidden', settings: 'update',
          financial: 'hidden',
        }
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRoleChange = (role: Role, checked: boolean) => {
    let newRoles = [...formData.roles];

    if (checked) {
        if (!newRoles.includes(role)) {
            newRoles.push(role);
        }
    } else {
        // Prevent unchecking the last role
        if (newRoles.length > 1) {
            newRoles = newRoles.filter(r => r !== role);
        }
    }

    const newPermissions = calculatePermissionsForRoles(newRoles);

    setFormData(prev => ({
        ...prev,
        roles: newRoles,
        permissions: newPermissions,
        requesterId: newRoles.includes('client') ? prev.requesterId : ''
    }));
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [name]: value as PermissionLevel }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      await updateUser({ ...user, ...formData });
    } else {
      await addUser(formData);
    }
    onSave();
  };
  
  // Security and permission logic
  const permissionsAreLocked = formData.roles.includes('master') || (formData.roles.includes('admin') && !loggedInUser?.roles.includes('master'));
  const isEditingSelf = user && loggedInUser && user.id === loggedInUser.id;
  const isAdminEditingMaster = user?.roles.includes('master') && loggedInUser?.roles.includes('admin') && !loggedInUser.roles.includes('master');
  
  // A non-master user cannot edit their own roles. An admin cannot edit a master.
  const isRoleFieldDisabled = (isEditingSelf && !loggedInUser?.roles.includes('master')) || isAdminEditingMaster;

  const availableRoles: Role[] = loggedInUser?.roles.includes('master') 
    ? ['master', 'admin', 'supervisor', 'inspector', 'client']
    : ['admin', 'supervisor', 'inspector', 'client'];
  
  const permissions: (keyof User['permissions'])[] = ['dashboard', 'appointments', 'pendencies', 'financial', 'newRequests', 'reports', 'users', 'settings'];

  if (isAdminEditingMaster) {
      return (
          <div className="p-4 text-center">
              <p className="text-red-600 dark:text-red-400 font-medium">Administradores não podem editar usuários Master.</p>
          </div>
      );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required spellCheck="true" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
        </div>
         <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required spellCheck="false" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
        </div>
        
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Perfis de Acesso</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
                {availableRoles.map(r => {
                    // A master user cannot remove their own 'master' role.
                    const isMasterCheckboxForSelf = isEditingSelf && loggedInUser?.roles.includes('master') && r === 'master';
                    return (
                        <div key={r} className="flex items-center">
                            <input
                                id={`role-${r}`}
                                name="roles"
                                type="checkbox"
                                value={r}
                                checked={formData.roles.includes(r)}
                                onChange={(e) => handleRoleChange(r, e.target.checked)}
                                disabled={isRoleFieldDisabled || isMasterCheckboxForSelf}
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <label htmlFor={`role-${r}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300 capitalize">
                                {roleTranslations[r]}
                            </label>
                        </div>
                    );
                })}
            </div>
            {isRoleFieldDisabled && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Você não pode alterar seus próprios perfis.</p>}
        </div>

        {formData.roles.includes('client') && (
            <div>
                <label htmlFor="requesterId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Solicitante Vinculado</label>
                <select name="requesterId" id="requesterId" value={formData.requesterId} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="" disabled>Selecione um solicitante...</option>
                    {settings.requesters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Este usuário só verá os dados do solicitante selecionado.</p>
            </div>
        )}
        
        {!user && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-md">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Um novo usuário será criado no sistema de autenticação com a senha padrão <strong>123mudar</strong>. O administrador será desconectado após esta ação.
                </p>
            </div>
        )}


        <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Permissões de Acesso aos Módulos</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {permissionsAreLocked ? 'As permissões são fixas para perfis Master/Admin (exceto quando editado por um Master).' : 'Defina o nível de acesso para cada área do sistema.'}
            </p>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissions.map(p => (
                     <div key={p}>
                        <label htmlFor={p} className="block text-sm text-gray-900 dark:text-gray-200 capitalize mb-1">{permissionTranslations[p]}</label>
                        <select 
                            id={p} 
                            name={p} 
                            value={formData.permissions[p]} 
                            onChange={handlePermissionChange} 
                            disabled={permissionsAreLocked}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                        >
                            <option value="edit">Alterar</option>
                            <option value="update">Atualizar</option>
                            <option value="view">Visualizar</option>
                            <option value="hidden">Ocultar</option>
                        </select>
                    </div>
                ))}
            </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onSave} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Salvar</button>
        </div>
    </form>
  );
};

export default UserForm;
