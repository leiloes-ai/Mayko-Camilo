
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { FinancialTransaction, FinancialTransactionType } from '../types.ts';
import { AppContext } from '../contexts/AppContext.tsx';

interface FinancialFormProps {
  transaction: FinancialTransaction | null;
  onSave: () => void;
}

const FinancialForm: React.FC<FinancialFormProps> = ({ transaction, onSave }) => {
  const { addFinancial, updateFinancial, settings, accounts, thirdParties } = useContext(AppContext);
  
  const [formData, setFormData] = useState({
    description: '',
    type: 'Receita' as FinancialTransactionType,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    accountId: '',
    thirdPartyId: '',
    notes: ''
  });

  const availableCategories = useMemo(() => {
    return settings.financialCategories.filter(cat => cat.type === formData.type);
  }, [settings.financialCategories, formData.type]);

  useEffect(() => {
    if (transaction) {
      const formattedAmount = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(transaction.amount);
      setFormData({
        description: transaction.description,
        type: transaction.type,
        amount: formattedAmount,
        date: transaction.date,
        category: transaction.category,
        accountId: transaction.accountId || '',
        thirdPartyId: transaction.thirdPartyId || '',
        notes: transaction.notes || ''
      });
    } else {
      setFormData({
        description: '',
        type: 'Receita',
        amount: '0,00',
        date: new Date().toISOString().split('T')[0],
        category: '',
        accountId: '',
        thirdPartyId: '',
        notes: ''
      });
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
    if (name === 'type') {
        setFormData(prev => ({ ...prev, type: value as FinancialTransactionType, category: '' }));
    } else if (name === 'amount') {
        setFormData(prev => ({ ...prev, [name]: handleCurrencyChange(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
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
        isPayableOrReceivable: false,
        status: 'Paga' as const,
    };
    
    if (transaction) {
      updateFinancial({ ...transaction, ...dataToSave });
    } else {
      addFinancial(dataToSave);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <input type="text" name="description" id="description" value={formData.description} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                <select name="type" id="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="Receita">Receita</option>
                    <option value="Despesa">Despesa</option>
                </select>
            </div>
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor (R$)</label>
                <input type="text" name="amount" id="amount" value={formData.amount} onChange={handleChange} required placeholder="150,50" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
                <input type="date" name="date" id="date" value={formData.date} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Conta</label>
                <select name="accountId" id="accountId" value={formData.accountId} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="" disabled>Selecione uma conta...</option>
                    {accounts.map(acc => (
                        <option key={acc.stringId} value={acc.stringId!}>{acc.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="thirdPartyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente / Fornecedor</label>
                <select name="thirdPartyId" id="thirdPartyId" value={formData.thirdPartyId} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="">Nenhum</option>
                    {thirdParties.map(tp => (
                        <option key={tp.stringId} value={tp.stringId!}>{tp.name} ({tp.type})</option>
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
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Salvar Transação</button>
        </div>
    </form>
  );
};

export default FinancialForm;
