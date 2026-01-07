import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

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
    const { theme } = useTheme();
    
    // Couleurs dynamiques selon le thème
    const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
    const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
    const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
    
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
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: cardBg,
          borderRadius: 12,
          boxShadow: theme === 'dark' ? '0 8px 32px rgba(0,0,0,0.8)' : '0 8px 32px rgba(0,0,0,0.2)',
          padding: 24,
          maxWidth: 500,
          width: '90%',
          border: `1px solid ${borderColor}`
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: 16,
            color: textColor
          }}>
            {confirmState.title}
          </h3>
          <p style={{
            marginBottom: 24,
            color: textColor,
            fontSize: '15px',
            lineHeight: '1.5'
          }}>
            {confirmState.message}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={handleCancel}
              style={{
                padding: '10px 20px',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#3d3d3d' : '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#ffffff';
              }}
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(244, 67, 54, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#d32f2f';
                e.target.style.boxShadow = '0 4px 8px rgba(244, 67, 54, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f44336';
                e.target.style.boxShadow = '0 2px 4px rgba(244, 67, 54, 0.3)';
              }}
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
