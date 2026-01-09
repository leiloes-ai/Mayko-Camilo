
import React, { useState, useContext, useEffect } from 'react';
import { ThirdParty, ThirdPartyType } from '../types.ts';
import { AppContext } from '../contexts/AppContext.tsx';

interface ThirdPartyFormProps {
  thirdParty: ThirdParty | null;
  onSave: () => void;
}

const ThirdPartyForm: React.FC<ThirdPartyFormProps> = ({ thirdParty, onSave }) => {
  const { addThirdParty, updateThirdParty } = useContext(AppContext);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'Cliente' as ThirdPartyType,
    documentType: 'CPF' as 'CPF' | 'CNPJ' | 'N/A',
    documentNumber: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    if (thirdParty) {
      setFormData({
        name: thirdParty.name,
        type: thirdParty.type,
        documentType: thirdParty.documentType,
        documentNumber: thirdParty.documentNumber || '',
        email: thirdParty.email || '',
        phone: thirdParty.phone || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'Cliente',
        documentType: 'CPF',
        documentNumber: '',
        email: '',
        phone: ''
      });
    }
  }, [thirdParty]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim() === '') {
        alert("O nome é obrigatório.");
        return;
    }
    
    const dataToSave = { ...formData };
    
    if (thirdParty) {
      updateThirdParty({ ...thirdParty, ...dataToSave });
    } else {
      addThirdParty(dataToSave);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome / Razão Social</label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
            <select name="type" id="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                <option value="Cliente">Cliente</option>
                <option value="Fornecedor">Fornecedor</option>
            </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Documento</label>
                <select name="documentType" id="documentType" value={formData.documentType} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="N/A">Não se aplica</option>
                </select>
            </div>
            <div>
                <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Número do Documento</label>
                <input type="text" name="documentNumber" id="documentNumber" value={formData.documentNumber} onChange={handleChange} disabled={formData.documentType === 'N/A'} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 dark:disabled:bg-gray-700/50" />
            </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
                <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
                <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onSave} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Salvar</button>
        </div>
    </form>
  );
};

export default ThirdPartyForm;
