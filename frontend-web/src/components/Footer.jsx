import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  const footerBg = theme === 'dark' ? '#1e1e1e' : '#f8f9fa';
  const footerBorder = theme === 'dark' ? '#333333' : '#e0e0e0';
  const footerText = theme === 'dark' ? '#b0b0b0' : '#999';

  return (
    <footer style={{
      backgroundColor: footerBg,
      borderTop: `1px solid ${footerBorder}`,
      padding: '20px',
      marginTop: 'auto',
      width: '100%',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        fontSize: '14px',
        color: footerText
      }}>
        © {currentYear} Fylora. {t('copyright')}
      </div>
    </footer>
  );
}

