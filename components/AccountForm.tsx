
import React, { useState, useContext, useEffect } from 'react';
import { FinancialAccount } from '../types.ts';
import { AppContext } from '../contexts/AppContext.tsx';

interface AccountFormProps {
  account: FinancialAccount | null;
  onSave: () => void;
}

const colorOptions = [
    'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-indigo-500', 'bg-fuchsia-500', 'bg-slate-500', 'bg-cyan-500'
];

const AccountForm: React.FC<AccountFormProps> = ({ account, onSave }) => {
  const { addAccount, updateAccount } = useContext(AppContext);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'Conta Corrente',
    initialBalance: '',
    color: colorOptions[0],
  });

  useEffect(() => {
    if (account) {
      const formattedBalance = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(account.initialBalance);
      setFormData({
        name: account.name,
        type: account.type,
        initialBalance: formattedBalance,
        color: account.color || colorOptions[0],
      });
    } else {
      setFormData({
        name: '',
        type: 'Conta Corrente',
        initialBalance: '0,00',
        color: colorOptions[0],
      });
    }
  }, [account]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'initialBalance') {
        setFormData(prev => ({ ...prev, [name]: handleCurrencyChange(value) }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceAsNumber = parseFloat(formData.initialBalance.replace(/\./g, '').replace(',', '.'));
    if (isNaN(balanceAsNumber)) {
        alert("Por favor, insira um saldo inicial numérico válido.");
        return;
    }

    const dataToSave = { 
        name: formData.name,
        type: formData.type,
        initialBalance: balanceAsNumber,
        color: formData.color,
    };
    
    if (account) {
      updateAccount({ ...account, ...dataToSave });
    } else {
      addAccount(dataToSave);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Conta</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required placeholder="Ex: Banco do Brasil, Caixa" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                <select name="type" id="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option>Conta Corrente</option>
                    <option>Conta Poupança</option>
                    <option>Dinheiro</option>
                    <option>Cartão de Crédito</option>
                    <option>Investimentos</option>
                    <option>Outro</option>
                </select>
            </div>
            <div>
                <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Saldo Inicial (R$)</label>
                <input type="text" name="initialBalance" id="initialBalance" value={formData.initialBalance} onChange={handleChange} required placeholder="1.500,50" className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cor de Destaque</label>
            <div className="mt-2 flex flex-wrap gap-3">
                {colorOptions.map(colorClass => (
                    <button
                        key={colorClass}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color: colorClass }))}
                        className={`w-8 h-8 rounded-full ${colorClass} transition-transform transform hover:scale-110 focus:outline-none ${formData.color === colorClass ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-gray-800' : ''}`}
                        aria-label={`Select ${colorClass}`}
                    />
                ))}
            </div>
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400">O saldo inicial é o valor que a conta possuía quando foi cadastrada. O saldo atual será calculado automaticamente com base nas transações.</p>

        <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onSave} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Salvar Conta</button>
        </div>
    </form>
  );
};

export default AccountForm;
