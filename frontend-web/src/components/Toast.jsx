import React, { useEffect, useState, useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Composant Toast pour afficher des notifications
 */
export const Toast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300); // Attendre l'animation de sortie
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: theme === 'dark' ? '#2d5016' : '#d4edda',
    error: theme === 'dark' ? '#5a1a1a' : '#f8d7da',
    warning: theme === 'dark' ? '#5a4a1a' : '#fff3cd',
    info: theme === 'dark' ? '#1a3a5a' : '#d1ecf1',
  }[type] || (theme === 'dark' ? '#2d2d2d' : '#ffffff');

  const textColor = {
    success: theme === 'dark' ? '#81c784' : '#155724',
    error: theme === 'dark' ? '#e57373' : '#721c24',
    warning: theme === 'dark' ? '#ffb74d' : '#856404',
    info: theme === 'dark' ? '#64b5f6' : '#0c5460',
  }[type] || (theme === 'dark' ? '#e0e0e0' : '#1a202c');

  const icon = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  }[type] || 'ℹ️';

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: bgColor,
        color: textColor,
        padding: '14px 20px',
        borderRadius: '8px',
        boxShadow: theme === 'dark'
          ? '0 4px 12px rgba(0, 0, 0, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        minWidth: '300px',
        maxWidth: '500px',
        zIndex: 10000,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(400px)',
        transition: 'all 0.3s ease-in-out',
        border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{message}</span>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose?.(), 300);
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: textColor,
          cursor: 'pointer',
          fontSize: '18px',
          padding: '0',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.7,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.7; }}
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
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const ToastContainer = () => {
    if (toasts.length === 0) return null;
    
    return (
      <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
        {toasts.map((toast, index) => (
          <div key={toast.id} style={{ pointerEvents: 'auto', marginTop: index > 0 ? '12px' : '0' }}>
            <Toast
              message={toast.message}
              type={toast.type}
              duration={toast.duration}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    );
  };

  return { showToast, ToastContainer };
};

