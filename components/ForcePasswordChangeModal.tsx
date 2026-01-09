
import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import Modal from './Modal.tsx';
import { EyeIcon, EyeSlashIcon } from './Icons.tsx';

interface ForcePasswordChangeModalProps {
  onClose: () => void;
}

const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({ onClose }) => {
    const { user, updatePassword } = useContext(AppContext);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState<{ type: 'error', text: string } | null>(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (!user) return;

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' });
            return;
        }
        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
            return;
        }
        if (newPassword === '123mudar') {
            setMessage({ type: 'error', text: 'Você deve escolher uma senha diferente da padrão.' });
            return;
        }

        // Use the '123mudar' as the old password for reauthentication
        const result = await updatePassword('123mudar', newPassword);

        if (result.success) {
            alert('Senha alterada com sucesso! Você já pode usar o sistema.');
            onClose();
        } else {
            setMessage({ type: 'error', text: result.message });
        }
    };

    return (
        <Modal isOpen={true} onClose={() => {}} title="Alteração de Senha Obrigatória">
             <div className="text-gray-700 dark:text-gray-300">
                <p className="mb-4">Este é seu primeiro acesso ou sua senha foi redefinida. Para garantir a segurança da sua conta, por favor, crie uma nova senha.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="newPasswordModal" className="block text-sm font-medium">Nova Senha</label>
                         <div className="relative mt-1">
                            <input
                                type={isPasswordVisible ? 'text' : 'password'}
                                id="newPasswordModal"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 pr-10"
                            />
                             <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                                {isPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="confirmPasswordModal" className="block text-sm font-medium">Confirmar Nova Senha</label>
                        <input
                            type="password"
                            id="confirmPasswordModal"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    {message && (
                        <p className="text-sm text-red-600 dark:text-red-400">{message.text}</p>
                    )}
                    <div className="pt-2 flex justify-end">
                        <button type="submit" className="px-5 py-2 bg-primary-600 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                            Definir Nova Senha
                        </button>
                    </div>
                </form>
             </div>
        </Modal>
    );
};

export default ForcePasswordChangeModal;