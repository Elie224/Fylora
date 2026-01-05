import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Thème sombre uniquement - toujours 'dark'
  const theme = 'dark';

  useEffect(() => {
    // Forcer le thème sombre au document
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'dark');
      // Supprimer l'ancien thème du localStorage
      localStorage.removeItem('theme');
    }
  }, []);

  // toggleTheme n'est plus nécessaire mais gardé pour compatibilité
  const toggleTheme = () => {
    // Ne fait rien - thème sombre uniquement
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: () => {}, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};





