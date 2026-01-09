
import React, { useEffect } from 'react';
import { CheckCircleIcon } from './Icons.tsx';

interface NotificationProps {
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); 

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-6 right-6 z-[100] bg-white dark:bg-gray-800 text-gray-800 dark:text-white p-4 rounded-lg shadow-2xl flex items-center animate-fade-in-out border-l-4 border-green-500">
        <div className="text-green-500">
            <CheckCircleIcon />
        </div>
        <div className="ml-3">
            <p className="font-bold">Sistema Atualizado</p>
            <p className="text-sm">{message}</p>
        </div>
        <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl font-bold">&times;</button>
    </div>
  );
};

export default Notification;
