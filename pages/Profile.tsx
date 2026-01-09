
import React, { useState, useContext, useRef } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import { UserIcon, EditIcon, EyeIcon, EyeSlashIcon } from '../components/Icons.tsx';
import { Role } from '../types.ts';

const Profile: React.FC = () => {
    const { user, updateUserPhoto, updatePassword, settings, updateSettings } = useContext(AppContext);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State for password change form
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [isOldPassVisible, setIsOldPassVisible] = useState(false);
    const [isNewPassVisible, setIsNewPassVisible] = useState(false);

    // State for master password form
    const [currentMasterPassword, setCurrentMasterPassword] = useState(settings.masterPassword || '002219');
    const [isMasterPassVisible, setIsMasterPassVisible] = useState(false);
    const [masterPasswordMessage, setMasterPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);


    if (!user) {
        return <p>Carregando perfil...</p>;
    }

    const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    updateUserPhoto(user.id, reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);

        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: 'As novas senhas não coincidem.' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.'});
            return;
        }

        const result = await updatePassword(oldPassword, newPassword);

        if (result.success) {
            setPasswordMessage({ type: 'success', text: result.message });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } else {
            setPasswordMessage({ type: 'error', text: result.message });
        }
    };
    
    const handleMasterPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMasterPasswordMessage(null);

        if (currentMasterPassword.length < 6) {
            setMasterPasswordMessage({ type: 'error', text: 'A senha master deve ter pelo menos 6 caracteres.' });
            return;
        }
        
        try {
            await updateSettings({ masterPassword: currentMasterPassword });
            setMasterPasswordMessage({ type: 'success', text: 'Senha master atualizada com sucesso!' });
        } catch (error) {
            setMasterPasswordMessage({ type: 'error', text: 'Ocorreu um erro ao salvar a senha.' });
        }
    };


    // FIX: Added missing 'supervisor' property to roleTranslations to satisfy Record<Role, string> type requirement.
    const roleTranslations: Record<Role, string> = { master: 'Master', admin: 'Administrador', supervisor: 'Supervisor', inspector: 'Vistoriador', client: 'Cliente' };

    return (
        <>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Meu Perfil</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center h-full">
                        <div className="relative w-32 h-32 mx-auto mb-4 group">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Foto do Perfil" className="rounded-full w-full h-full object-cover" />
                            ) : (
                                <div className="rounded-full w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <UserIcon />
                                </div>
                            )}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <EditIcon />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                        <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
                        <span className="mt-2 inline-block bg-primary-100 text-primary-800 text-sm font-semibold px-3 py-1 rounded-full dark:bg-primary-900 dark:text-primary-300">
                            {user.roles.map(r => roleTranslations[r]).join(', ')}
                        </span>
                    </div>
                </div>
                {/* Password Change Card */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg h-full">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Alterar Senha de Acesso</h3>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="oldPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha Atual</label>
                                <div className="relative mt-1">
                                    <input type={isOldPassVisible ? 'text' : 'password'} id="oldPassword" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 pr-10"/>
                                    <button type="button" onClick={() => setIsOldPassVisible(!isOldPassVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                                        {isOldPassVisible ? <EyeSlashIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nova Senha</label>
                                <div className="relative mt-1">
                                    <input type={isNewPassVisible ? 'text' : 'password'} id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 pr-10"/>
                                    <button type="button" onClick={() => setIsNewPassVisible(!isNewPassVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                                        {isNewPassVisible ? <EyeSlashIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirmar Nova Senha</label>
                                <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"/>
                            </div>
                            {passwordMessage && (
                                <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {passwordMessage.text}
                                </p>
                            )}
                            <div className="pt-2">
                                <button type="submit" className="px-5 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                    Salvar Nova Senha
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
             {user.roles.includes('master') && (
                <div className="mt-8">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Segurança Master</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Esta senha é necessária para ações críticas, como editar ou excluir transações financeiras. Ela é diferente da sua senha de login.</p>
                        <form onSubmit={handleMasterPasswordSubmit} className="space-y-4 max-w-md">
                            <div>
                                <label htmlFor="masterPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha Master</label>
                                <div className="relative mt-1">
                                    <input type={isMasterPassVisible ? 'text' : 'password'} id="masterPassword" value={currentMasterPassword} onChange={(e) => setCurrentMasterPassword(e.target.value)} required className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 pr-10"/>
                                    <button type="button" onClick={() => setIsMasterPassVisible(!isMasterPassVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                                        {isMasterPassVisible ? <EyeSlashIcon /> : <EyeIcon />}
                                    </button>
                                </div>
                            </div>
                            {masterPasswordMessage && (
                                <p className={`text-sm ${masterPasswordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                    {masterPasswordMessage.text}
                                </p>
                            )}
                            <div className="pt-2">
                                <button type="submit" className="px-5 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                                    Salvar Senha Master
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
             )}
        </>
    );
};

export default Profile;
