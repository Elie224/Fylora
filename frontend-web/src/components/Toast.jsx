import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Composant Toast pour afficher des notifications
 * Remplace les alert() et prompt() natifs
 */
const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onClose?.(), 300); // Attendre l'animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white',
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-4 min-w-[300px] max-w-[500px] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${typeStyles[type] || typeStyles.info}`}
    >
      <div className="flex-1">{message}</div>
      <button
        onClick={handleClose}
        className="text-current opacity-70 hover:opacity-100 transition-opacity"
        aria-label={t('close')}
      >
        ×
      </button>
    </div>
  );
};

/**
 * Hook pour gérer les toasts
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const ToastContainer = () => (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );

  return { showToast, ToastContainer };
};

/**
 * Fonction utilitaire pour afficher des confirmations
 */
export const useConfirm = () => {
  const { t } = useLanguage();
  const [confirmState, setConfirmState] = useState(null);

  const confirm = (message, title = t('confirm')) => {
    return new Promise((resolve) => {
      setConfirmState({
        message,
        title,
        resolve,
      });
    });
  };

  const ConfirmDialog = () => {
    if (!confirmState) return null;

    const handleConfirm = () => {
      confirmState.resolve(true);
      setConfirmState(null);
    };

    const handleCancel = () => {
      confirmState.resolve(false);
      setConfirmState(null);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">{confirmState.title}</h3>
          <p className="mb-6">{confirmState.message}</p>
          <div className="flex gap-4 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return { confirm, ConfirmDialog };
};

export default Toast;
