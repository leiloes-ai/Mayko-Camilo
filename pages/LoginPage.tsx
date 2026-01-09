
import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import Modal from '../components/Modal.tsx';

const DefaultLogo = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
    </svg>
);

const LoginPage: React.FC = () => {
    const { login, settings, logo, sendPasswordReset } = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // State for password recovery modal
    const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
    const [recoveryEmail, setRecoveryEmail] = useState('');
    const [recoveryMessage, setRecoveryMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // A lógica de 'rememberMe' é gerenciada pelo Firebase Auth. O padrão é 'local' (lembrar).
        const result = await login(email, password);

        if (!result.success) {
            setError(result.message);
            setIsLoading(false);
        }
    };
    
    const handleRecoverySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setRecoveryMessage(null);
        
        const result = await sendPasswordReset(recoveryEmail);
        setRecoveryMessage({
            type: result.success ? 'success' : 'error',
            text: result.message
        });
    };

    return (
        <>
            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-900 p-4">
                <div className="absolute inset-0 h-full w-full flex items-center justify-center pointer-events-none" aria-hidden="true">
                    {logo ? (
                        <img src={logo} alt="Watermark" className="h-full w-full object-contain opacity-5 blur-sm scale-125"/>
                    ) : (
                        <DefaultLogo className="h-4/5 w-4/5 text-gray-300 dark:text-gray-700 opacity-20" />
                    )}
                </div>
                <div className="relative z-10 w-full max-w-4xl">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden md:flex">
                        {/* Coluna da Esquerda (Branding) - visível em telas médias e maiores */}
                        <div className="hidden md:flex md:w-2/5 bg-primary-600 p-12 flex-col items-center justify-center text-white text-center">
                            {logo ? (
                                <img src={logo} alt="App Logo" className="h-40 w-auto object-contain" />
                            ) : (
                                <DefaultLogo className="h-40 w-40 text-white" />
                            )}
                            <h2 className="mt-6 text-3xl font-bold">Bem-vindo de volta!</h2>
                            <p className="mt-2 text-primary-200">Estamos felizes em te ver novamente.</p>
                        </div>

                        {/* Coluna da Direita (Formulário) */}
                        <div className="w-full md:w-3/5 p-8 md:p-12 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                            {/* Logo para a visão mobile */}
                            <div className="md:hidden text-center mb-8">
                               {logo ? (
                                    <img src={logo} alt="App Logo" className="mx-auto h-28 w-auto object-contain" />
                                ) : (
                                    <DefaultLogo className="mx-auto h-28 w-28 text-primary-600 dark:text-primary-400" />
                                )}
                            </div>
                            
                            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                                {settings.appName}
                            </h2>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                Faça login para acessar o painel
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-5 mt-8">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Endereço de e-mail
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            id="email" name="email" type="email" autoComplete="email" required
                                            value={email} onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Senha
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            id="password" name="password" type="password" autoComplete="current-password" required
                                            value={password} onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                                        />
                                    </div>
                                </div>
                                
                                {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                         {/* A funcionalidade "Lembrar-me" agora é gerenciada pelo Firebase Auth e está ativa por padrão */}
                                    </div>
                                    <div className="text-sm">
                                        <button type="button" onClick={() => setIsRecoveryModalOpen(true)} className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                                            Esqueceu a senha?
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <button
                                        type="submit" disabled={isLoading}
                                        className="flex w-full justify-center rounded-md border border-transparent bg-primary-600 py-2.5 px-4 text-base font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:bg-primary-300 disabled:cursor-not-allowed transition-all duration-300"
                                    >
                                        {isLoading ? 'Entrando...' : 'Entrar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            
            <Modal isOpen={isRecoveryModalOpen} onClose={() => setIsRecoveryModalOpen(false)} title="Recuperar Senha">
                <form onSubmit={handleRecoverySubmit}>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Insira seu e-mail abaixo. Um e-mail de recuperação será enviado para você com as instruções para redefinir sua senha.
                    </p>
                    <div className="mt-4">
                        <label htmlFor="recovery-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Endereço de e-mail
                        </label>
                        <input
                            id="recovery-email" name="recovery-email" type="email" required
                            value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)}
                            className="mt-1 block w-full appearance-none rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                        />
                    </div>
                    {recoveryMessage && (
                        <p className={`mt-3 text-sm ${recoveryMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {recoveryMessage.text}
                        </p>
                    )}
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={() => setIsRecoveryModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200">
                            Cancelar
                        </button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">
                            Enviar Solicitação
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default LoginPage;