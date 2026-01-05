import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Composant d'alerte de quota (non intrusif)
 * S'affiche quand le quota atteint 80%, 90%, 95%
 */
export default function QuotaAlert({ quota }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { theme } = useTheme();
  
  if (!quota || quota.percentage < 80) {
    return null;
  }

  const percentage = quota.percentage || 0;
  
  // Déterminer le niveau d'alerte
  let alertLevel = 'info';
  let message = '';
  let icon = '💾';
  
  if (percentage >= 95) {
    alertLevel = 'error';
    const msg = t('quotaAlertCritical', { percentage: percentage.toFixed(1) }) || `Stockage critique ! Vous avez utilisé ${percentage.toFixed(1)}% de votre espace. Mettez à niveau maintenant pour éviter d'être bloqué.`;
    message = msg.replace('{percentage}', percentage.toFixed(1));
    icon = '🚨';
  } else if (percentage >= 90) {
    alertLevel = 'warning';
    const msg = t('quotaAlertHigh', { percentage: percentage.toFixed(1) }) || `Attention ! Votre stockage atteint ${percentage.toFixed(1)}%. Pensez à mettre à niveau votre plan.`;
    message = msg.replace('{percentage}', percentage.toFixed(1));
    icon = '⚠️';
  } else if (percentage >= 80) {
    alertLevel = 'info';
    const msg = t('quotaAlertMedium', { percentage: percentage.toFixed(1) }) || `Votre stockage atteint ${percentage.toFixed(1)}%. Vous pouvez mettre à niveau votre plan pour plus d'espace.`;
    message = msg.replace('{percentage}', percentage.toFixed(1));
    icon = 'ℹ️';
  }

  const bgColor = {
    info: theme === 'dark' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
    warning: theme === 'dark' ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 152, 0, 0.05)',
    error: theme === 'dark' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)',
  }[alertLevel];

  const borderColor = {
    info: theme === 'dark' ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)',
    warning: theme === 'dark' ? 'rgba(255, 152, 0, 0.3)' : 'rgba(255, 152, 0, 0.2)',
    error: theme === 'dark' ? 'rgba(244, 67, 54, 0.3)' : 'rgba(244, 67, 54, 0.2)',
  }[alertLevel];

  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';

  return (
    <div
      style={{
        padding: '16px 20px',
        backgroundColor: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '12px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <span style={{ fontSize: '24px' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: textColor,
            marginBottom: '4px'
          }}>
            {message}
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: theme === 'dark' ? '#b0b0b0' : '#666',
            marginTop: '4px'
          }}>
            {t('used') || 'Utilisé'}: {quota.used ? (quota.used / (1024 * 1024 * 1024)).toFixed(2) : 0} GB / {quota.limit ? (quota.limit / (1024 * 1024 * 1024)).toFixed(0) : 0} GB
          </div>
        </div>
      </div>
      <button
        onClick={() => navigate('/pricing')}
        style={{
          padding: '10px 20px',
          backgroundColor: alertLevel === 'error' ? '#f44336' : alertLevel === 'warning' ? '#ff9800' : '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s',
          boxShadow: `0 2px 8px ${alertLevel === 'error' ? 'rgba(244, 67, 54, 0.3)' : alertLevel === 'warning' ? 'rgba(255, 152, 0, 0.3)' : 'rgba(33, 150, 243, 0.3)'}`,
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = `0 4px 12px ${alertLevel === 'error' ? 'rgba(244, 67, 54, 0.4)' : alertLevel === 'warning' ? 'rgba(255, 152, 0, 0.4)' : 'rgba(33, 150, 243, 0.4)'}`;
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = `0 2px 8px ${alertLevel === 'error' ? 'rgba(244, 67, 54, 0.3)' : alertLevel === 'warning' ? 'rgba(255, 152, 0, 0.3)' : 'rgba(33, 150, 243, 0.3)'}`;
        }}
      >
        {t('upgrade') || 'Mettre à niveau'}
      </button>
    </div>
  );
}

