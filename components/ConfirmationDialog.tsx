
import React from 'react';
import Modal from './Modal.tsx';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmButtonColor?: 'red' | 'blue';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onClose, onConfirm, title, message, confirmButtonColor = 'red' }) => {
  const colorClasses = confirmButtonColor === 'red'
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-primary-600 hover:bg-primary-700';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div>
        <p className="text-gray-600 dark:text-gray-300">{message}</p>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-md transition-colors ${colorClasses}`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;