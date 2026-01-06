import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';

export default function Support() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const bgColor = theme === 'dark' ? '#121212' : '#fafbfc';
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const primaryColor = '#2196F3';

  const supportEmail = 'kouroumaelisee@gmail.com';
  const supportPhone = '+33689306432';

  const handleEmailClick = () => {
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(t('supportEmailSubject') || 'Support Fylora')}`;
  };

  const handlePhoneClick = () => {
    window.location.href = `tel:${supportPhone}`;
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    showToast(t('emailCopied') || 'Email copié dans le presse-papiers !', 'success');
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(supportPhone);
    showToast(t('phoneCopied') || 'Numéro de téléphone copié dans le presse-papiers !', 'success');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: bgColor,
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: textColor,
            marginBottom: '16px'
          }}>
            {t('support') || 'Support'}
          </h1>
          <p style={{
            fontSize: '20px',
            color: textSecondary,
            marginBottom: '32px'
          }}>
            {t('supportDescription') || 'Nous sommes là pour vous aider. Contactez-nous par email ou téléphone.'}
          </p>
        </div>

        {/* Contact Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '40px'
        }}>
          {/* Email Card */}
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '16px',
            padding: '32px',
            border: `1px solid ${borderColor}`,
            boxShadow: theme === 'dark' 
              ? '0 4px 6px rgba(0, 0, 0, 0.3)' 
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = theme === 'dark'
              ? '0 8px 16px rgba(0, 0, 0, 0.4)'
              : '0 4px 16px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = theme === 'dark'
              ? '0 4px 6px rgba(0, 0, 0, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
          >
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              📧
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: textColor,
              marginBottom: '12px'
            }}>
              {t('email') || 'Email'}
            </h2>
            <p style={{
              fontSize: '16px',
              color: textSecondary,
              marginBottom: '24px',
              wordBreak: 'break-word'
            }}>
              {supportEmail}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleEmailClick}
                style={{
                  padding: '12px 24px',
                  backgroundColor: primaryColor,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  boxShadow: `0 2px 8px rgba(33, 150, 243, 0.3)`
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1976D2';
                  e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = primaryColor;
                  e.target.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.3)';
                }}
              >
                {t('sendEmail') || 'Envoyer un email'}
              </button>
              <button
                onClick={handleCopyEmail}
                style={{
                  padding: '12px 24px',
                  backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f0f4f8',
                  color: textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? '#3d3d3d' : '#e0e8f0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#f0f4f8';
                }}
              >
                {t('copy') || 'Copier'}
              </button>
            </div>
          </div>

          {/* Phone Card */}
          <div style={{
            backgroundColor: cardBg,
            borderRadius: '16px',
            padding: '32px',
            border: `1px solid ${borderColor}`,
            boxShadow: theme === 'dark' 
              ? '0 4px 6px rgba(0, 0, 0, 0.3)' 
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = theme === 'dark'
              ? '0 8px 16px rgba(0, 0, 0, 0.4)'
              : '0 4px 16px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = theme === 'dark'
              ? '0 4px 6px rgba(0, 0, 0, 0.3)'
              : '0 2px 8px rgba(0, 0, 0, 0.1)';
          }}
          >
            <div style={{
              fontSize: '48px',
              marginBottom: '16px'
            }}>
              📞
            </div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: textColor,
              marginBottom: '12px'
            }}>
              {t('phone') || 'Téléphone'}
            </h2>
            <p style={{
              fontSize: '16px',
              color: textSecondary,
              marginBottom: '24px'
            }}>
              {supportPhone}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handlePhoneClick}
                style={{
                  padding: '12px 24px',
                  backgroundColor: primaryColor,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  boxShadow: `0 2px 8px rgba(33, 150, 243, 0.3)`
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1976D2';
                  e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = primaryColor;
                  e.target.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.3)';
                }}
              >
                {t('call') || 'Appeler'}
              </button>
              <button
                onClick={handleCopyPhone}
                style={{
                  padding: '12px 24px',
                  backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f0f4f8',
                  color: textColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? '#3d3d3d' : '#e0e8f0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#f0f4f8';
                }}
              >
                {t('copy') || 'Copier'}
              </button>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div style={{
          backgroundColor: cardBg,
          borderRadius: '16px',
          padding: '32px',
          border: `1px solid ${borderColor}`,
          marginTop: '40px'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: textColor,
            marginBottom: '16px'
          }}>
            {t('supportHours') || 'Heures de support'}
          </h2>
          <p style={{
            fontSize: '16px',
            color: textSecondary,
            lineHeight: '1.6',
            marginBottom: '24px'
          }}>
            {t('supportHoursDescription') || 'Notre équipe de support est disponible du lundi au vendredi, de 9h à 18h (heure de Paris). Nous répondons généralement dans les 24 heures.'}
          </p>

          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: textColor,
            marginBottom: '16px',
            marginTop: '32px'
          }}>
            {t('commonQuestions') || 'Questions fréquentes'}
          </h2>
          <p style={{
            fontSize: '16px',
            color: textSecondary,
            lineHeight: '1.6',
            marginBottom: '16px'
          }}>
            {t('commonQuestionsDescription') || 'Consultez notre page de tarification pour les questions fréquemment posées sur nos plans et tarifs.'}
          </p>
          <button
            onClick={() => window.location.href = '/pricing'}
            style={{
              padding: '12px 24px',
              backgroundColor: primaryColor,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              boxShadow: `0 2px 8px rgba(33, 150, 243, 0.3)`
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1976D2';
              e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = primaryColor;
              e.target.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.3)';
            }}
          >
            {t('viewFAQ') || 'Voir les FAQ'}
          </button>
        </div>
      </div>
    </div>
  );
}

