import React from 'react';
import { useToast } from './Toast';

/**
 * Provider pour les toasts - à ajouter dans App
 */
export const ToastProvider = ({ children }) => {
  const { ToastContainer } = useToast();

  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
};

/**
 * Hook global pour utiliser les toasts
 */
let toastInstance = null;

export const setToastInstance = (instance) => {
  toastInstance = instance;
};

export const useGlobalToast = () => {
  const toast = useToast();
  
  React.useEffect(() => {
    setToastInstance(toast);
  }, [toast]);

  return toast;
};

