import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext.tsx';
import { ThirdParty, FinancialCategory, FinancialTransactionType, Service } from '../../types.ts';
import { AddIcon, DeleteIcon, EditIcon } from '../../components/Icons.tsx';
import ConfirmationDialog from '../../components/ConfirmationDialog.tsx';
import Modal from '../../components/Modal.tsx';
import ThirdPartyForm from '../../components/ThirdPartyForm.tsx';

type Tab = 'categories' | 'thirdParties' | 'services';

const CategoriesClients: React.FC = () => {
    const { user, settings, updateSettings, thirdParties, financials, deleteThirdParty } = useContext(AppContext);
    
    const [activeTab, setActiveTab] = useState<Tab>('thirdParties');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ type: 'category' | 'thirdParty' | 'service', item: any } | null>(null);

    // State for categories
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<FinancialCategory | null>(null);
    const [categoryName, setCategoryName] = useState('');
    const [categoryType, setCategoryType] = useState<FinancialTransactionType>('Despesa');

    // State for third parties
    const [isThirdPartyModalOpen, setIsThirdPartyModalOpen] = useState(false);
    const [selectedThirdParty, setSelectedThirdParty] = useState<ThirdParty | null>(null);

    // State for services
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [currentService, setCurrentService] = useState<Service | null>(null);
    const [serviceData, setServiceData] = useState({ name: '', price: '0,00' });

    const canEdit = user?.permissions.financial === 'edit';

    const sortedThirdParties = useMemo(() => {
        return [...thirdParties].sort((a, b) => a.name.localeCompare(b.name));
    }, [thirdParties]);
    
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };
    
    const handleCurrencyChange = (value: string): string => {
        let cleanValue = value.replace(/[^\d]/g, '');
        if (!cleanValue) return '0,00';
        cleanValue = cleanValue.replace(/^0+/, '');
        if (cleanValue.length === 0) return '0,00';
        cleanValue = cleanValue.padStart(3, '0');
        const decimalPart = cleanValue.slice(-2);
        const integerPart = cleanValue.slice(0, -2);
        const formattedIntegerPart = new Intl.NumberFormat('pt-BR').format(parseInt(integerPart, 10));
        return `${formattedIntegerPart},${decimalPart}`;
    };

    // --- Category Logic ---
    const openCategoryModal = (item: FinancialCategory | null) => {
        setCurrentCategory(item);
        setCategoryName(item ? item.name : '');
        setCategoryType(item ? item.type : 'Despesa');
        setIsCategoryModalOpen(true);
    };
    const closeCategoryModal = () => { setIsCategoryModalOpen(false); setCurrentCategory(null); setCategoryName(''); };
    
    const handleSaveCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryName.trim()) return;

        let updatedList: FinancialCategory[];
        if (currentCategory) {
            updatedList = settings.financialCategories.map(item => item.id === currentCategory.id ? { ...item, name: categoryName.trim(), type: categoryType } : item);
        } else {
            const newItem: FinancialCategory = { id: new Date().getTime().toString(), name: categoryName.trim(), type: categoryType };
            updatedList = [...settings.financialCategories, newItem];
        }
        updateSettings({ financialCategories: updatedList });
        closeCategoryModal();
    };
    
    // --- Third Party Logic ---
    const openThirdPartyModal = (tp: ThirdParty | null) => {
        setSelectedThirdParty(tp);
        setIsThirdPartyModalOpen(true);
    };
    const closeThirdPartyModal = () => {
        setIsThirdPartyModalOpen(false);
        setSelectedThirdParty(null);
    };

    // --- Service Logic ---
    const openServiceModal = (item: Service | null) => {
        setCurrentService(item);
        if (item) {
            setServiceData({ name: item.name, price: handleCurrencyChange(String(item.price * 100)) });
        } else {
            setServiceData({ name: '', price: '0,00' });
        }
        setIsServiceModalOpen(true);
    };
    const closeServiceModal = () => { setIsServiceModalOpen(false); setCurrentService(null); };

    const handleSaveService = (e: React.FormEvent) => {
        e.preventDefault();
        if (!serviceData.name.trim()) return;
        const priceAsNumber = parseFloat(serviceData.price.replace(/\./g, '').replace(',', '.'));
        if (isNaN(priceAsNumber)) { alert("Valor inválido."); return; }

        let updatedList: Service[];
        if (currentService) {
            updatedList = (settings.services || []).map(item => item.id === currentService.id ? { ...item, name: serviceData.name.trim(), price: priceAsNumber } : item);
        } else {
            const newItem: Service = { id: new Date().getTime().toString(), name: serviceData.name.trim(), price: priceAsNumber };
            updatedList = [...(settings.services || []), newItem];
        }
        updateSettings({ services: updatedList });
        closeServiceModal();
    };

    // --- Delete Logic ---
    const openDeleteDialog = (type: 'category' | 'thirdParty' | 'service', item: any) => {
        setItemToDelete({ type, item });
        setIsConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;
        const { type, item } = itemToDelete;

        if (type === 'category') {
            const isInUse = financials.some(t => t.category === item.name);
            if (isInUse) {
                alert(`Não é possível remover "${item.name}" pois está sendo utilizada em uma ou mais transações.`);
            } else {
                const updatedList = settings.financialCategories.filter(i => i.id !== item.id);
                updateSettings({ financialCategories: updatedList });
            }
        } else if (type === 'thirdParty') {
            const isInUse = financials.some(t => t.thirdPartyId === item.stringId);
             if (isInUse) {
                alert(`Não é possível remover "${item.name}" pois está associado a uma ou mais transações.`);
            } else {
                if (item.stringId) deleteThirdParty(item.stringId);
            }
        } else if (type === 'service') {
            const updatedList = (settings.services || []).filter(i => i.id !== item.id);
            updateSettings({ services: updatedList });
        }
        setIsConfirmOpen(false);
        setItemToDelete(null);
    };

    // --- Render Functions ---
    const renderCategories = () => (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Categorias Financeiras</h3>
                <button onClick={() => openCategoryModal(null)} disabled={!canEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 disabled:bg-primary-300">
                    <AddIcon /> Adicionar Categoria
                </button>
            </div>
            <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {settings.financialCategories.map(item => (
                        <li key={item.id} className="px-4 py-3 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div>
                                <span className="text-gray-900 dark:text-gray-200">{item.name}</span>
                                <span className={`ml-3 text-xs font-semibold px-2 py-0.5 rounded-full ${item.type === 'Receita' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>{item.type}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openCategoryModal(item)} disabled={!canEdit} className="p-1 text-primary-500 hover:text-primary-700 disabled:opacity-30"><EditIcon /></button>
                                <button onClick={() => openDeleteDialog('category', item)} disabled={!canEdit} className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"><DeleteIcon /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
    
    const renderThirdParties = () => (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Clientes & Fornecedores</h3>
                <button onClick={() => openThirdPartyModal(null)} disabled={!canEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 disabled:bg-primary-300">
                    <AddIcon /> Adicionar
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-3">Nome</th>
                            <th className="px-6 py-3">Tipo</th>
                            <th className="px-6 py-3">Documento</th>
                            <th className="px-6 py-3">Contato</th>
                            <th className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedThirdParties.map(tp => (
                             <tr key={tp.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{tp.name}</td>
                                <td className="px-6 py-4">{tp.type}</td>
                                <td className="px-6 py-4">{tp.documentNumber || 'N/A'}</td>
                                <td className="px-6 py-4">{tp.email || tp.phone || 'N/A'}</td>
                                <td className="px-6 py-4 flex justify-center items-center gap-3">
                                    <button onClick={() => openThirdPartyModal(tp)} disabled={!canEdit} className="p-1 text-primary-500 hover:text-primary-700 disabled:opacity-30"><EditIcon /></button>
                                    <button onClick={() => openDeleteDialog('thirdParty', tp)} disabled={!canEdit} className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"><DeleteIcon /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {sortedThirdParties.length === 0 && <p className="text-center py-8 text-gray-500 dark:text-gray-400">Nenhum cliente ou fornecedor cadastrado.</p>}
            </div>
        </div>
    );

    const renderServices = () => (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Serviços</h3>
                <button onClick={() => openServiceModal(null)} disabled={!canEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg shadow hover:bg-primary-700 disabled:bg-primary-300">
                    <AddIcon /> Adicionar Serviço
                </button>
            </div>
            <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(settings.services || []).map(item => (
                        <li key={item.id} className="px-4 py-3 flex items-center justify-between bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div>
                                <span className="text-gray-900 dark:text-gray-200">{item.name}</span>
                                <span className="ml-3 text-sm font-semibold text-green-700 dark:text-green-300">{formatCurrency(item.price)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openServiceModal(item)} disabled={!canEdit} className="p-1 text-primary-500 hover:text-primary-700 disabled:opacity-30"><EditIcon /></button>
                                <button onClick={() => openDeleteDialog('service', item)} disabled={!canEdit} className="p-1 text-red-500 hover:text-red-700 disabled:opacity-30"><DeleteIcon /></button>
                            </div>
                        </li>
                    ))}
                </ul>
                {(settings.services || []).length === 0 && <p className="text-center py-8 text-gray-500 dark:text-gray-400">Nenhum serviço cadastrado.</p>}
            </div>
        </div>
    );
    
    return (
        <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                    <nav className="-mb-px flex space-x-6">
                        <button onClick={() => setActiveTab('thirdParties')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'thirdParties' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                           Clientes & Fornecedores
                        </button>
                        <button onClick={() => setActiveTab('categories')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'categories' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                           Categorias
                        </button>
                        <button onClick={() => setActiveTab('services')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'services' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                           Serviços
                        </button>
                    </nav>
                </div>
                {activeTab === 'categories' && renderCategories()}
                {activeTab === 'thirdParties' && renderThirdParties()}
                {activeTab === 'services' && renderServices()}
            </div>

            <Modal isOpen={isCategoryModalOpen} onClose={closeCategoryModal} title={currentCategory ? 'Editar Categoria' : 'Nova Categoria'}>
                <form onSubmit={handleSaveCategory} className="space-y-4">
                    <div>
                        <label htmlFor="categoryName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                        <input type="text" id="categoryName" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required autoFocus className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500"/>
                    </div>
                     <div>
                        <label htmlFor="categoryType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                        <select id="categoryType" value={categoryType} onChange={(e) => setCategoryType(e.target.value as FinancialTransactionType)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500">
                            <option value="Despesa">Despesa (Contas a Pagar)</option>
                            <option value="Receita">Receita (Contas a Receber)</option>
                        </select>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={closeCategoryModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Salvar</button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isThirdPartyModalOpen} onClose={closeThirdPartyModal} title={selectedThirdParty ? 'Editar Cliente/Fornecedor' : 'Novo Cliente/Fornecedor'}>
                <ThirdPartyForm thirdParty={selectedThirdParty} onSave={closeThirdPartyModal} />
            </Modal>

            <Modal isOpen={isServiceModalOpen} onClose={closeServiceModal} title={currentService ? 'Editar Serviço' : 'Novo Serviço'}>
                <form onSubmit={handleSaveService} className="space-y-4">
                    <div>
                        <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Serviço</label>
                        <input type="text" id="serviceName" value={serviceData.name} onChange={(e) => setServiceData(p => ({...p, name: e.target.value}))} required autoFocus className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500"/>
                    </div>
                     <div>
                        <label htmlFor="servicePrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor Padrão (R$)</label>
                        <input type="text" name="servicePrice" id="servicePrice" value={serviceData.price} onChange={(e) => setServiceData(p => ({...p, price: handleCurrencyChange(e.target.value)}))} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500"/>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={closeServiceModal} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Salvar</button>
                    </div>
                </form>
            </Modal>

            <ConfirmationDialog isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={confirmDelete} title="Confirmar Exclusão" message={`Tem certeza que deseja remover "${itemToDelete?.item.name}"?`} />
        </>
    );
};

export default CategoriesClients;