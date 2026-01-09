import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext.tsx';
import { Settings as SettingsType, SettingCategory, ThemePalette, TextPalette, Theme } from '../types.ts';
import { AddIcon, DeleteIcon, EditIcon, ArrowUpIcon, ArrowDownIcon, ClockIcon } from '../components/Icons.tsx';
import ConfirmationDialog from '../components/ConfirmationDialog.tsx';
import Modal from '../components/Modal.tsx';
import DebugTerminal from '../components/DebugTerminal.tsx';

type Tab = 'general' | 'layout' | 'appearance' | 'notifications';
type SettingKey = 'requesters' | 'demands' | 'inspectionTypes' | 'patios' | 'statuses';

const categoryLabels: Record<SettingKey, string> = {
    requesters: 'Solicitantes',
    demands: 'Demandas',
    inspectionTypes: 'Tipos de Vistoria',
    patios: 'Pátios',
    statuses: 'Status dos Agendamentos',
};

const palettes: { id: ThemePalette; name: string; colors: string[] }[] = [
    { id: 'blue', name: 'Padrão (Azul)', colors: ['#3b82f6', '#1d4ed8'] },
    { id: 'green', name: 'Verde Esmeralda', colors: ['#10b981', '#047857'] },
    { id: 'purple', name: 'Roxo Imperial', colors: ['#8b5cf6', '#6d28d9'] },
    { id: 'orange', name: 'Laranja Âmbar', colors: ['#f59e0b', '#b45309'] },
    { id: 'pink', name: 'Rosa Vibrante', colors: ['#f43f5e', '#be123c'] },
    { id: 'red', name: 'Vermelho Rubi', colors: ['#ef4444', '#b91c1c'] },
    { id: 'navy', name: 'Azul Marinho', colors: ['#3f51b5', '#303f9f'] },
    { id: 'maroon', name: 'Vermelho Sangue', colors: ['#991b1b', '#800000'] },
];

const ToggleSwitch: React.FC<{ label: string; enabled: boolean; onChange: (enabled: boolean) => void; disabled: boolean }> = ({ label, enabled, onChange, disabled }) => (
    <label className="flex items-center justify-between cursor-pointer">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enabled ? 'translate-x-5' : 'translate-x-0'}`}/>
        </button>
    </label>
);

const Settings: React.FC = () => {
    const { 
        settings, updateSettings, appointments, user, logo, updateLogo,
        theme, setTheme, themePalette, setThemePalette, textPalette, setTextPalette
    } = useContext(AppContext);
    
    const isAdminOrMaster = user?.roles.includes('master') || user?.roles.includes('admin');
    const canEdit = user?.permissions.settings === 'edit';
    const canUpdate = user?.permissions.settings === 'edit' || user?.permissions.settings === 'update';
    
    const [activeTab, setActiveTab] = useState<Tab>(isAdminOrMaster ? 'general' : 'appearance');
    const [localSettings, setLocalSettings] = useState<SettingsType>(settings);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [currentKey, setCurrentKey] = useState<SettingKey | null>(null);
    const [currentItem, setCurrentItem] = useState<SettingCategory | null>(null);
    const [itemName, setItemName] = useState('');
    const [itemToDelete, setItemToDelete] = useState<{ key: SettingKey; item: SettingCategory } | null>(null);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    if (!user || user?.permissions.settings === 'hidden') {
        return (
            <div className="text-center p-10 bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded-r-lg">
                <h2 className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">Acesso Negado</h2>
                <p className="mt-2 text-yellow-700 dark:text-yellow-300">Você não tem permissão para visualizar esta página.</p>
            </div>
        );
    }
    
    const allTabs = [
        { id: 'general', label: 'Geral', condition: isAdminOrMaster },
        { id: 'layout', label: 'Identidade Visual', condition: isAdminOrMaster },
        { id: 'appearance', label: 'Aparência', condition: true },
        { id: 'notifications', label: 'Logs e Alertas', condition: true },
    ];
    const visibleTabs = allTabs.filter(tab => tab.condition);

    const handleSave = () => {
        const { id, ...settingsToSave } = localSettings;
        updateSettings(settingsToSave); 
        alert('Configurações salvas!'); 
    };
    
    const openModal = (key: SettingKey, item: SettingCategory | null) => { setCurrentKey(key); setCurrentItem(item); setItemName(item ? item.name : ''); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setCurrentKey(null); setCurrentItem(null); setItemName(''); };
    
    const handleSaveItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentKey || !itemName.trim()) return;
        let updatedList: SettingCategory[];
        if (currentItem) {
            updatedList = (localSettings[currentKey] as SettingCategory[]).map(item => item.id === currentItem.id ? { ...item, name: itemName.trim() } : item);
        } else {
            const newItem: SettingCategory = { id: new Date().getTime().toString(), name: itemName.trim() };
            updatedList = [...localSettings[currentKey], newItem];
        }
        setLocalSettings(prev => ({ ...prev, [currentKey]: updatedList }));
        closeModal();
    };

    const openDeleteDialog = (key: SettingKey, item: SettingCategory) => { setItemToDelete({ key, item }); setIsConfirmOpen(true); };
    const closeDeleteDialog = () => { setIsConfirmOpen(false); setItemToDelete(null); };
    const confirmDelete = () => {
        if (!itemToDelete) return;
        const { key, item } = itemToDelete;
        const isInUse = appointments.some(app => {
            if (key === 'requesters') return app.requester === item.name;
            if (key === 'demands') return app.demand === item.name;
            if (key === 'inspectionTypes') return app.inspectionType === item.name;
            if (key === 'patios') return app.patio === item.name;
            if (key === 'statuses') return app.status === item.name;
            return false;
        });
        if (isInUse) {
            alert(`"${item.name}" está em uso.`);
            closeDeleteDialog();
            return;
        }
        const updatedList = (localSettings[key] as SettingCategory[]).filter(i => i.id !== item.id);
        setLocalSettings(prev => ({ ...prev, [key]: updatedList }));
        closeDeleteDialog();
    };

    const handleMoveItem = (key: SettingKey, index: number, direction: 'up' | 'down') => {
        const list = [...(localSettings[key] as SettingCategory[])];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= list.length) return;
        [list[index], list[newIndex]] = [list[newIndex], list[index]];
        setLocalSettings(prev => ({ ...prev, [key]: list }));
    };
    
    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { alert("Max 2MB."); return; }
            const reader = new FileReader();
            reader.onloadend = () => { if (reader.result) updateLogo(reader.result as string); };
            reader.readAsDataURL(file);
        }
    };
    
    const renderGeneralSettings = () => (
        <div className="space-y-8">
            {(['requesters', 'demands', 'inspectionTypes', 'patios', 'statuses'] as SettingKey[]).map(key => (
                <div key={key}>
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{categoryLabels[key]}</h3>
                        <button onClick={() => openModal(key, null)} disabled={!canEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 disabled:bg-primary-300">
                            <AddIcon /> Adicionar
                        </button>
                    </div>
                    <div className="mt-4 border rounded-lg overflow-hidden dark:border-gray-700">
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                            {localSettings[key] && (localSettings[key] as SettingCategory[]).map((item, index) => (
                                <li key={item.id} className="px-4 py-3 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <span className="text-gray-900 dark:text-gray-200">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        {key === 'statuses' && (
                                            <>
                                                <button onClick={() => handleMoveItem(key, index, 'up')} disabled={index === 0 || !canEdit} className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"><ArrowUpIcon /></button>
                                                <button onClick={() => handleMoveItem(key, index, 'down')} disabled={index === (localSettings[key] as SettingCategory[]).length - 1 || !canEdit} className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"><ArrowDownIcon /></button>
                                            </>
                                        )}
                                        <button onClick={() => openModal(key, item)} disabled={!canEdit} className="p-1 text-primary-500 hover:text-primary-700 disabled:opacity-30"><EditIcon /></button>
                                        <button onClick={() => openDeleteDialog(key, item)} disabled={!canEdit} className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"><DeleteIcon /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderLayoutSettings = () => (
        <div className="space-y-6">
            <div>
                <label htmlFor="appName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Aplicação</label>
                <input type="text" id="appName" value={localSettings.appName} onChange={(e) => setLocalSettings(prev => ({ ...prev, appName: e.target.value }))} disabled={!canEdit} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo da Aplicação</label>
                <div className="mt-2 flex items-center gap-4">
                    <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                        {logo ? <img src={logo} alt="Logo" className="object-contain h-full w-full" /> : <span className="text-xs text-gray-500">Sem Logo</span>}
                    </div>
                    <div>
                        <input type="file" ref={fileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" disabled={!canEdit} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={!canEdit} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50">Alterar Logo</button>
                        <button type="button" onClick={() => updateLogo(null)} disabled={!canEdit || !logo} className="ml-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50">Remover Logo</button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderAppearanceSettings = () => (
        <div className="space-y-8">
            <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Tema da Aplicação</h3>
                <div className="mt-3 flex gap-4">
                    <button onClick={() => setTheme('light')} disabled={!canUpdate} className={`px-4 py-2 rounded-lg disabled:opacity-50 ${theme === 'light' ? 'bg-primary-500 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700'}`}>Claro</button>
                    <button onClick={() => setTheme('dark')} disabled={!canUpdate} className={`px-4 py-2 rounded-lg disabled:opacity-50 ${theme === 'dark' ? 'bg-primary-500 text-white shadow-lg' : 'bg-gray-200 dark:bg-gray-700'}`}>Escuro</button>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Cor de Destaque</h3>
                <div className="mt-3 grid grid-cols-4 sm:grid-cols-8 gap-4">
                    {palettes.map(p => (
                        <button key={p.id} onClick={() => setThemePalette(p.id)} disabled={!canUpdate} className={`h-10 w-10 rounded-full border-2 transition-transform transform hover:scale-110 ${themePalette === p.id ? 'border-gray-900 dark:border-white scale-110 ring-2 ring-primary-400' : 'border-transparent'}`} style={{ backgroundColor: p.colors[0] }} title={p.name} />
                    ))}
                </div>
            </div>
        </div>
    );

    const renderNotificationsSettings = () => (
        <div className="space-y-6">
            <div>
                 <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Alertas do App</h3>
                 <div className="mt-4 space-y-3 max-w-md">
                     <ToggleSwitch label="Habilitar alerta sonoro" enabled={localSettings.enableSoundAlert ?? false} onChange={(enabled) => setLocalSettings(p => ({ ...p, enableSoundAlert: enabled }))} disabled={!canUpdate} />
                      <ToggleSwitch label="Habilitar vibração" enabled={localSettings.enableVibrationAlert ?? false} onChange={(enabled) => setLocalSettings(p => ({ ...p, enableVibrationAlert: enabled }))} disabled={!canUpdate} />
                 </div>
            </div>
            {isAdminOrMaster && (
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Console de Debug</h3>
                    <button onClick={() => setIsTerminalOpen(true)} className="mt-4 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 flex items-center gap-2 font-mono text-sm">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        Visualizar Logs do Sistema
                    </button>
                </div>
            )}
        </div>
    );
    
    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 dark:text-white tracking-tighter">Configurações</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium">Preferências do sistema.</p>
                </div>
                {canUpdate && (
                    <button onClick={handleSave} className="px-6 py-2.5 bg-primary-600 text-white rounded-xl shadow-lg hover:bg-primary-700 transition-all font-black text-xs uppercase tracking-widest w-full sm:w-auto">
                        Salvar
                    </button>
                )}
            </div>
            
            <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto no-scrollbar">
                <nav className="-mb-px flex space-x-6 min-w-max pb-1">
                    {visibleTabs.map(tab => (
                       <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`py-3 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                           {tab.label}
                       </button>
                    ))}
                </nav>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700/50">
                {activeTab === 'general' && renderGeneralSettings()}
                {activeTab === 'layout' && renderLayoutSettings()}
                {activeTab === 'appearance' && renderAppearanceSettings()}
                {activeTab === 'notifications' && renderNotificationsSettings()}
            </div>

            {isAdminOrMaster && <DebugTerminal isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={currentItem ? 'Editar Registro' : 'Novo Registro'}>
                <form onSubmit={handleSaveItem}>
                    <div>
                        <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                        <input type="text" id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} required autoFocus className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500" />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md font-bold">Salvar</button>
                    </div>
                </form>
            </Modal>

            <ConfirmationDialog isOpen={isConfirmOpen} onClose={closeDeleteDialog} onConfirm={confirmDelete} title="Confirmar Exclusão" message={`Remover "${itemToDelete?.item.name}"?`} />
        </>
    );
};

export default Settings;