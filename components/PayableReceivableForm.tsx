
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { FinancialTransaction, FinancialTransactionType } from '../types.ts';
import { AppContext } from '../contexts/AppContext.tsx';

interface PayableReceivableFormProps {
  transaction: FinancialTransaction | null;
  type: FinancialTransactionType;
  onSave: () => void;
}

const PayableReceivableForm: React.FC<PayableReceivableFormProps> = ({ transaction, type, onSave }) => {
  const { addFinancial, updateFinancial, settings, thirdParties } = useContext(AppContext);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    category: '',
    thirdPartyId: '',
    notes: ''
  });
  const [selectedServiceId, setSelectedServiceId] = useState('');

  const isReceita = type === 'Receita';

  const relevantThirdParties = useMemo(() => {
    return thirdParties.filter(tp => isReceita ? tp.type === 'Cliente' : tp.type === 'Fornecedor');
  }, [thirdParties, isReceita]);

  const availableCategories = useMemo(() => {
    return settings.financialCategories.filter(cat => cat.type === type);
  }, [settings.financialCategories, type]);

  useEffect(() => {
    if (transaction) {
      const formattedAmount = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(transaction.amount);
      setFormData({
        description: transaction.description,
        amount: formattedAmount,
        dueDate: transaction.dueDate || new Date().toISOString().split('T')[0],
        category: transaction.category,
        thirdPartyId: transaction.thirdPartyId || '',
        notes: transaction.notes || ''
      });
    } else {
      setFormData({ description: '', amount: '0,00', dueDate: new Date().toISOString().split('T')[0], category: '', thirdPartyId: '', notes: '' });
      setSelectedServiceId('');
    }
  }, [transaction]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'amount') {
        setFormData(prev => ({ ...prev, [name]: handleCurrencyChange(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value;
    setSelectedServiceId(serviceId);

    if (serviceId) {
        const service = settings.services.find(s => s.id === serviceId);
        if (service) {
            setFormData(prev => ({
                ...prev,
                description: service.name,
                amount: new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(service.price)
            }));
        }
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountAsNumber = parseFloat(formData.amount.replace(/\./g, '').replace(',', '.'));
    if (isNaN(amountAsNumber) || amountAsNumber <= 0) {
        alert("Por favor, insira um valor numérico válido e positivo.");
        return;
    }

    const dataToSave = { 
        ...formData, 
        amount: amountAsNumber,
        isPayableOrReceivable: true,
        type: type,
        status: 'Pendente' as const
    };
    
    if (transaction) {
      const finalData = { ...transaction, ...dataToSave, paymentDate: transaction.paymentDate, accountId: transaction.accountId, date: transaction.date || new Date().toISOString().split('T')[0] };
      updateFinancial(finalData);
    } else {
      const finalData = { ...dataToSave, date: new Date().toISOString().split('T')[0] };
      addFinancial(finalData);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        {isReceita && settings.services?.length > 0 && (
            <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                <label htmlFor="serviceId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Lançar a partir de um Serviço (Opcional)</label>
                <select name="serviceId" id="serviceId" value={selectedServiceId} onChange={handleServiceChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="">Selecione um serviço para preencher...</option>
                    {settings.services.map(s => (
                        <option key={s.id} value={s.id}>
                            {s.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(s.price)}
                        </option>
                    ))}
                </select>
            </div>
        )}
        <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <input type="text" name="description" id="description" value={formData.description} onChange={handleChange} required placeholder={isReceita ? "Ex: Vistoria Completa - Cliente X" : "Ex: Aluguel do Escritório"} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor (R$)</label>
                <input type="text" name="amount" id="amount" value={formData.amount} onChange={handleChange} required placeholder="150,50" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
                <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data de Vencimento</label>
                <input type="date" name="dueDate" id="dueDate" value={formData.dueDate} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="thirdPartyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{isReceita ? 'Cliente' : 'Fornecedor'}</label>
                <select name="thirdPartyId" id="thirdPartyId" value={formData.thirdPartyId} onChange={handleChange} required={isReceita} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="" disabled={isReceita}>{isReceita ? 'Selecione...' : 'Nenhum / Opcional'}</option>
                    {relevantThirdParties.map(tp => (
                        <option key={tp.stringId} value={tp.stringId!}>{tp.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
                <select name="category" id="category" value={formData.category} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="" disabled>Selecione...</option>
                    {availableCategories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                </select>
            </div>
        </div>

        <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observações</label>
            <textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onSave} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Salvar Conta</button>
        </div>
    </form>
  );
};

export default PayableReceivableForm;
