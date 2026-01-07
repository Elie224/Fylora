/* @refresh reset */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  setLanguage as setLangStorage, 
  getCurrentLanguage, 
  t as translate,
  supportedLanguages,
  formatNumber,
  formatDate,
  formatFileSize
} from '../utils/i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    // Récupérer la langue depuis localStorage ou utiliser 'fr' par défaut
    // AUCUNE détection automatique - seul l'utilisateur peut changer la langue
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && supportedLanguages[savedLanguage]) {
      return savedLanguage;
    }
    // Langue par défaut : français (pas de détection automatique)
    const defaultLanguage = 'fr';
    setLangStorage(defaultLanguage);
    return defaultLanguage;
  });
  const [updateKey, setUpdateKey] = useState(0); // Clé pour forcer le re-render

  useEffect(() => {
    // Appliquer la langue au chargement
    setLangStorage(language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);
  
  useEffect(() => {
    // Écouter les changements dans localStorage (pour synchroniser entre onglets)
    const handleStorageChange = (e) => {
      if (e.key === 'language' && e.newValue && supportedLanguages[e.newValue]) {
        setLanguageState(e.newValue);
        document.documentElement.setAttribute('lang', e.newValue);
        setUpdateKey(prev => prev + 1); // Force le re-render
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Écouter les changements personnalisés (pour le même onglet)
    const handleLanguageChange = (e) => {
      if (e.detail && supportedLanguages[e.detail]) {
        setLanguageState(e.detail);
        setLangStorage(e.detail);
        document.documentElement.setAttribute('lang', e.detail);
        setUpdateKey(prev => prev + 1); // Force le re-render
      }
    };
    
    window.addEventListener('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const setLanguage = useCallback((lang) => {
    if (lang && supportedLanguages[lang]) {
      setLanguageState(lang);
      setLangStorage(lang);
      document.documentElement.setAttribute('lang', lang);
      setUpdateKey(prev => prev + 1); // Force le re-render
      
      // Déclencher un événement personnalisé pour notifier les autres composants
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
    }
  }, []);

  const t = useCallback((key, params = null) => {
    // Utiliser la langue du contexte React (qui est toujours à jour)
    if (!key) return '';
    try {
      return translate(key, params, language);
    } catch (error) {
      console.error(`[i18n] Error translating key "${key}":`, error);
      return key || '';
    }
  }, [language, updateKey]); // Dépendre de language et updateKey pour forcer la mise à jour

  // Fonctions utilitaires de formatage
  const formatNumberLocalized = useCallback((number) => {
    return formatNumber(number, language);
  }, [language]);

  const formatDateLocalized = useCallback((date, options = {}) => {
    return formatDate(date, options, language);
  }, [language]);

  const formatFileSizeLocalized = useCallback((bytes) => {
    return formatFileSize(bytes, language);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      updateKey,
      supportedLanguages,
      formatNumber: formatNumberLocalized,
      formatDate: formatDateLocalized,
      formatFileSize: formatFileSizeLocalized
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
