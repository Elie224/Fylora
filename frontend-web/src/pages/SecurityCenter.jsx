import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Toast';

const SecurityCenter = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const [loginHistory, setLoginHistory] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [securityStats, setSecurityStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Couleurs dynamiques selon le thème
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const secondaryBg = theme === 'dark' ? '#2d2d2d' : '#f7fafc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f0f4f8';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const bgColor = theme === 'dark' ? '#121212' : '#fafbfc';
  const shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';
  const errorBg = theme === 'dark' ? '#3d1f1f' : '#fef2f2';
  const errorText = theme === 'dark' ? '#ff6b6b' : '#dc2626';
  const successBg = theme === 'dark' ? '#1a3d1a' : '#f0fdf4';
  const successText = theme === 'dark' ? '#4ade80' : '#16a34a';
  const primaryColor = '#2196F3';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [historyRes, sessionsRes, statsRes] = await Promise.all([
        api.get('/security/login-history'),
        api.get('/security/sessions'),
        api.get('/security/stats'),
      ]);

      setLoginHistory(historyRes.data.data || historyRes.data || []);
      setActiveSessions(sessionsRes.data.data || sessionsRes.data || []);
      setSecurityStats(statsRes.data.data || statsRes.data || null);
    } catch (err) {
      console.error('Failed to load security data:', err);
      setError(err.response?.data?.error?.message || t('errorLoadingData'));
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    const confirmed = await confirm(t('confirmRevokeSession'));
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/security/sessions/${sessionId}`);
      await loadData();
      showToast(t('sessionRevoked'), 'success');
    } catch (err) {
      console.error('Failed to revoke session:', err);
      showToast(err.response?.data?.error?.message || t('errorRevokingSession'), 'error');
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    const confirmed = await confirm(t('confirmRevokeAllSessions'));
    if (!confirmed) {
      return;
    }

    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        showToast(t('errorRevokingSessions'), 'error');
        return;
      }
      
      // Utiliser POST au lieu de DELETE pour éviter les problèmes avec le body
      await api.post('/security/sessions/revoke-all', { refresh_token: refreshToken });
      await loadData();
      showToast(t('allOtherSessionsRevoked'), 'success');
    } catch (err) {
      console.error('Failed to revoke sessions:', err);
      showToast(err.response?.data?.error?.message || t('errorRevokingSessions'), 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (err) {
      return '-';
    }
  };

  const getLocationDisplay = (location) => {
    return location || t('unknown');
  };

  if (loading) {
    return (
      <>
        <ConfirmDialog />
        <div style={{ padding: '32px 16px', backgroundColor: bgColor, minHeight: '100vh' }}>
          <div style={{ textAlign: 'center', color: textColor }}>
            <p>{t('loading')}...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <ConfirmDialog />
        <div style={{ padding: '32px 16px', backgroundColor: bgColor, minHeight: '100vh' }}>
          <div style={{
            backgroundColor: errorBg,
            border: `1px solid ${errorText}`,
            color: errorText,
            padding: '12px 16px',
            borderRadius: '8px'
          }}>
            <p>{error}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: '0 auto', 
      padding: '32px 16px', 
      backgroundColor: bgColor, 
      minHeight: '100vh' 
    }}>
      <h1 style={{ 
        fontSize: '28px', 
        fontWeight: 'bold', 
        marginBottom: '24px', 
        color: textColor 
      }}>
        {t('securityCenter')}
      </h1>

      {/* Statistiques */}
      {securityStats && (
        <div style={{
          backgroundColor: cardBg,
          borderRadius: '12px',
          boxShadow: `0 2px 8px ${shadowColor}`,
          padding: '24px',
          marginBottom: '24px',
          border: `1px solid ${borderColor}`
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            marginBottom: '20px', 
            color: textColor 
          }}>
            {t('securityStatistics')}
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px'
          }}>
            <div>
              <p style={{ fontSize: '14px', color: textSecondary, marginBottom: '8px' }}>
                {t('totalLogins')}
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: textColor }}>
                {securityStats.totalLogins || 0}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: textSecondary, marginBottom: '8px' }}>
                {t('successfulLogins')}
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: successText }}>
                {securityStats.successfulLogins || 0}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: textSecondary, marginBottom: '8px' }}>
                {t('failedLogins')}
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: errorText }}>
                {securityStats.failedLogins || 0}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: textSecondary, marginBottom: '8px' }}>
                {t('activeSessions')}
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: textColor }}>
                {securityStats.activeSessions || 0}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '14px', color: textSecondary, marginBottom: '8px' }}>
                {t('uniqueIPs')}
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: textColor }}>
                {securityStats.uniqueIPs || 0}
              </p>
            </div>
            {securityStats.lastLogin && (
              <div>
                <p style={{ fontSize: '14px', color: textSecondary, marginBottom: '8px' }}>
                  {t('lastLogin')}
                </p>
                <p style={{ fontSize: '14px', color: textColor, marginBottom: '4px' }}>
                  {formatDate(securityStats.lastLogin.date)}
                </p>
                <p style={{ fontSize: '12px', color: textSecondary }}>
                  {securityStats.lastLogin.ip}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sessions actives */}
      <div style={{
        backgroundColor: cardBg,
        borderRadius: '12px',
        boxShadow: `0 2px 8px ${shadowColor}`,
        padding: '24px',
        marginBottom: '24px',
        border: `1px solid ${borderColor}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: textColor }}>
            {t('activeSessions')}
          </h2>
          {activeSessions.length > 1 && (
            <button
              onClick={handleRevokeAllOtherSessions}
              style={{
                backgroundColor: errorText,
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#ef4444'}
              onMouseLeave={(e) => e.target.style.backgroundColor = errorText}
            >
              {t('revokeAllOtherSessions')}
            </button>
          )}
        </div>
        {activeSessions.length === 0 ? (
          <p style={{ color: textSecondary }}>{t('noActiveSessions')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeSessions.map((session) => (
              <div
                key={session._id || session.id}
                style={{
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: secondaryBg
                }}
              >
                <div>
                  <p style={{ fontWeight: '600', color: textColor, marginBottom: '4px' }}>
                    {getLocationDisplay(session.location)}
                  </p>
                  <p style={{ fontSize: '14px', color: textSecondary, marginBottom: '4px' }}>
                    {session.ip_address || 'Inconnu'}
                  </p>
                  <p style={{ fontSize: '12px', color: textSecondary, marginBottom: '4px' }}>
                    {session.user_agent || 'Inconnu'}
                  </p>
                  <p style={{ fontSize: '12px', color: textSecondary }}>
                    {t('lastActivity')}: {formatDate(session.last_activity)}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeSession(session._id || session.id)}
                  style={{
                    backgroundColor: errorText,
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#ef4444'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = errorText}
                >
                  {t('revoke')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historique des connexions */}
      <div style={{
        backgroundColor: cardBg,
        borderRadius: '12px',
        boxShadow: `0 2px 8px ${shadowColor}`,
        padding: '24px',
        border: `1px solid ${borderColor}`
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: textColor }}>
          {t('loginHistory')}
        </h2>
        {loginHistory.length === 0 ? (
          <p style={{ color: textSecondary }}>{t('noLoginHistory')}</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: secondaryBg }}>
                <tr>
                  <th style={{
                    padding: '12px 24px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: textSecondary,
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${borderColor}`
                  }}>
                    {t('date')}
                  </th>
                  <th style={{
                    padding: '12px 24px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: textSecondary,
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${borderColor}`
                  }}>
                    {t('ipAddress')}
                  </th>
                  <th style={{
                    padding: '12px 24px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: textSecondary,
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${borderColor}`
                  }}>
                    {t('location')}
                  </th>
                  <th style={{
                    padding: '12px 24px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: textSecondary,
                    textTransform: 'uppercase',
                    borderBottom: `1px solid ${borderColor}`
                  }}>
                    {t('status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((entry, index) => (
                  <tr 
                    key={entry._id || entry.id}
                    style={{
                      borderBottom: `1px solid ${borderColor}`,
                      backgroundColor: index % 2 === 0 ? cardBg : secondaryBg
                    }}
                  >
                    <td style={{
                      padding: '16px 24px',
                      whiteSpace: 'nowrap',
                      fontSize: '14px',
                      color: textColor
                    }}>
                      {formatDate(entry.created_at || entry.date)}
                    </td>
                    <td style={{
                      padding: '16px 24px',
                      whiteSpace: 'nowrap',
                      fontSize: '14px',
                      color: textColor
                    }}>
                      {entry.ip_address || entry.ip || 'Inconnu'}
                    </td>
                    <td style={{
                      padding: '16px 24px',
                      whiteSpace: 'nowrap',
                      fontSize: '14px',
                      color: textColor
                    }}>
                      {getLocationDisplay(entry.location)}
                    </td>
                    <td style={{ padding: '16px 24px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          backgroundColor: entry.success !== false ? successBg : errorBg,
                          color: entry.success !== false ? successText : errorText,
                          fontWeight: '500'
                        }}
                      >
                        {entry.success !== false ? t('success') : t('failed')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityCenter;

