
import React, { useState, useContext } from 'react';
import Modal from './Modal.tsx';
import { AppContext } from '../contexts/AppContext.tsx';
import { EyeIcon, EyeSlashIcon } from './Icons.tsx';

interface PasswordPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PasswordPromptModal: React.FC<PasswordPromptModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { settings } = useContext(AppContext);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleConfirm = () => {
        if (password === settings.masterPassword) {
            setError('');
            setPassword('');
            onSuccess();
        } else {
            setError('Senha master incorreta. Tente novamente.');
        }
    };

    const handleClose = () => {
        setError('');
        setPassword('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Confirmação de Segurança">
            <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-300">Para prosseguir com esta ação, por favor, insira a senha master de segurança.</p>
                <div>
                    <label htmlFor="masterPasswordPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha Master</label>
                    <div className="relative mt-1">
                        <input
                            type={isPasswordVisible ? 'text' : 'password'}
                            id="masterPasswordPrompt"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                            required
                            autoFocus
                            className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 pr-10"
                        />
                        <button type="button" onClick={() => setIsPasswordVisible(!isPasswordVisible)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600">
                            {isPasswordVisible ? <EyeSlashIcon /> : <EyeIcon />}
                        </button>
                    </div>
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={handleClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancelar</button>
                    <button type="button" onClick={handleConfirm} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Confirmar</button>
                </div>
            </div>
        </Modal>
    );
};

export default PasswordPromptModal;
