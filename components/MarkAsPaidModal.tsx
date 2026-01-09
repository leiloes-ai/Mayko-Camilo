
import React, { useState, useContext } from 'react';
import Modal from './Modal.tsx';
import { AppContext } from '../contexts/AppContext.tsx';
import { FinancialTransaction } from '../types.ts';

interface MarkAsPaidModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: FinancialTransaction;
}

const MarkAsPaidModal: React.FC<MarkAsPaidModalProps> = ({ isOpen, onClose, transaction }) => {
    const { accounts, updateFinancial } = useContext(AppContext);
    
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [accountId, setAccountId] = useState('');
    const [error, setError] = useState('');

    const isReceita = transaction.type === 'Receita';
    const title = isReceita ? 'Confirmar Recebimento' : 'Baixar Pagamento';
    
    const handleSubmit = async () => {
        if (!accountId) {
            setError('Por favor, selecione uma conta para liquidar a transação.');
            return;
        }
        setError('');
        
        const updatedTransaction: FinancialTransaction = {
            ...transaction,
            status: 'Paga',
            paymentDate: paymentDate,
            date: paymentDate, // The effective transaction date is the payment date
            accountId: accountId,
        };

        await updateFinancial(updatedTransaction);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-4">
                <p>Confirme os detalhes da liquidação para <strong>"{transaction.description}"</strong> no valor de <strong>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount)}</strong>.</p>
                
                <div>
                    <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data do Pagamento</label>
                    <input type="date" name="paymentDate" id="paymentDate" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
                </div>
                
                <div>
                    <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{isReceita ? 'Conta de Destino' : 'Conta de Origem'}</label>
                     <select name="accountId" id="accountId" value={accountId} onChange={(e) => setAccountId(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500">
                        <option value="" disabled>Selecione uma conta...</option>
                        {accounts.map(acc => (
                            <option key={acc.stringId} value={acc.stringId!}>{acc.name}</option>
                        ))}
                    </select>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200">Cancelar</button>
                    <button type="button" onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Confirmar</button>
                </div>
            </div>
        </Modal>
    );
};

export default MarkAsPaidModal;
