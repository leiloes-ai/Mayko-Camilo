
import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import { User, Role } from '../types.ts';
import { AddIcon, EditIcon, DeleteIcon, SearchIcon, KeyIcon, UserIcon } from '../components/Icons.tsx';
import Modal from '../components/Modal.tsx';
import ConfirmationDialog from '../components/ConfirmationDialog.tsx';
import UserForm from '../components/UserForm.tsx';

const roleTranslations: Record<Role, string> = {
  master: 'Master',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  inspector: 'Vistoriador',
  client: 'Cliente',
};

const Users: React.FC = () => {
  const { user: loggedInUser, users, deleteUser, resetPassword, loading } = useContext(AppContext);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToAction, setUserToAction] = useState<User | null>(null);

  const canEdit = loggedInUser?.permissions.users === 'edit';

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  const handleOpenModal = (user: User | null) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteClick = (user: User) => {
    setUserToAction(user);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (userToAction) {
      deleteUser(userToAction.id);
      alert(`O perfil de ${userToAction.name} foi removido do banco de dados. Lembre-se de remover o usuário também da aba de Autenticação do Firebase.`);
    }
    setIsDeleteConfirmOpen(false);
    setUserToAction(null);
  };

  const handleResetClick = (user: User) => {
    setUserToAction(user);
    setIsResetConfirmOpen(true);
  };

  const confirmReset = async () => {
    if (userToAction) {
      const result = await resetPassword(userToAction.email);
      alert(result.message);
    }
    setIsResetConfirmOpen(false);
    setUserToAction(null);
  };

  if (!loggedInUser || loggedInUser.permissions.users === 'hidden') {
    return (
        <div className="text-center p-10 bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded-r-lg">
            <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">Acesso Negado</h2>
            <p className="mt-2 text-yellow-700 dark:text-yellow-300">Você não tem permissão para gerenciar usuários.</p>
        </div>
    );
  }

  const renderLoading = () => <p className="text-center py-8">Carregando usuários...</p>;

  const renderCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {filteredUsers.map(user => {
            const isMasterUser = user.roles.includes('master');
            const isAdminEditingMaster = isMasterUser && !loggedInUser.roles.includes('master');
            const isSelf = user.id === loggedInUser.id;

            return (
                <div key={user.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                             {user?.photoURL ? <img src={user.photoURL} alt="Foto do perfil" className="h-full w-full object-cover" /> : <UserIcon />}
                        </div>
                        <div className="overflow-hidden">
                            <p className="font-bold text-gray-800 dark:text-white truncate">{user.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.roles.map(r => roleTranslations[r]).join(', ')}</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-2 pl-2">
                        <button onClick={() => handleOpenModal(user)} disabled={!canEdit} className="text-primary-500 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"><EditIcon /></button>
                        <button onClick={() => handleDeleteClick(user)} disabled={!canEdit || isSelf || isAdminEditingMaster} className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"><DeleteIcon /></button>
                    </div>
                </div>
            );
        })}
    </div>
  );

  const renderTable = () => (
     <div className="overflow-x-auto hidden md:block">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                    <th scope="col" className="px-6 py-3">Nome</th>
                    <th scope="col" className="px-6 py-3">Email</th>
                    <th scope="col" className="px-6 py-3">Perfil</th>
                    <th scope="col" className="px-6 py-3 text-center">Ações</th>
                </tr>
            </thead>
            <tbody>
                {filteredUsers.map(user => {
                    const isMasterUser = user.roles.includes('master');
                    const isAdminEditingMaster = isMasterUser && !loggedInUser.roles.includes('master');
                    const isSelf = user.id === loggedInUser.id;

                    return (
                        <tr key={user.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{user.name}</td>
                            <td className="px-6 py-4">{user.email}</td>
                            <td className="px-6 py-4 capitalize">{user.roles.map(r => roleTranslations[r]).join(', ')}</td>
                            <td className="px-6 py-4 flex justify-center items-center gap-3">
                                <button onClick={() => handleOpenModal(user)} disabled={!canEdit} className="text-primary-500 hover:text-primary-700 disabled:text-gray-400 disabled:cursor-not-allowed"><EditIcon /></button>
                                <button onClick={() => handleResetClick(user)} disabled={!canEdit || isSelf || isAdminEditingMaster} className="text-amber-500 hover:text-amber-700 disabled:text-gray-400 disabled:cursor-not-allowed" title="Enviar E-mail de Redefinição de Senha">
                                    <KeyIcon />
                                </button>
                                <button onClick={() => handleDeleteClick(user)} disabled={!canEdit || isSelf || isAdminEditingMaster} className="text-red-500 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed"><DeleteIcon /></button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
  );

  return (
    <>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Gerenciamento de Usuários</h1>
                <p className="mt-1 text-gray-600 dark:text-gray-400">Adicione, edite e remova usuários do sistema.</p>
            </div>
            <button onClick={() => handleOpenModal(null)} disabled={!canEdit} className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg shadow hover:bg-primary-600 transition-colors font-semibold disabled:bg-primary-300 disabled:cursor-not-allowed">
                <AddIcon />
                Novo Usuário
            </button>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="relative mb-4">
                <input 
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    spellCheck="true"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><SearchIcon /></div>
            </div>
            
            {loading ? renderLoading() : (
                <>
                  {renderTable()}
                  {renderCards()}
                  {!loading && filteredUsers.length === 0 && <p className="text-center py-8">Nenhum usuário encontrado.</p>}
                </>
            )}
        </div>

        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedUser ? 'Editar Usuário' : 'Novo Usuário'}>
            <UserForm user={selectedUser} onSave={handleCloseModal} />
        </Modal>

        <ConfirmationDialog
            isOpen={isDeleteConfirmOpen}
            onClose={() => setIsDeleteConfirmOpen(false)}
            onConfirm={confirmDelete}
            title="Confirmar Exclusão"
            message={`Tem certeza que deseja excluir o perfil de ${userToAction?.name}? O usuário também deverá ser removido da aba de Autenticação no Firebase.`}
        />

        <ConfirmationDialog
            isOpen={isResetConfirmOpen}
            onClose={() => setIsResetConfirmOpen(false)}
            onConfirm={confirmReset}
            title="Confirmar Redefinição de Senha"
            message={`Tem certeza que deseja enviar um e-mail de redefinição de senha para ${userToAction?.name}?`}
            confirmButtonColor="blue"
        />
    </>
  );
};

export default Users;
