import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuthStore } from '../services/authStore';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../components/Toast';

export default function Sessions() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showToast, ToastContainer } = useToast();
  const { logout } = useAuthStore();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#64748b';
  const bgColor = theme === 'dark' ? '#121212' : '#f8fafc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f1f5f9';
  const dangerBg = '#f44336';
  const successBg = '#4CAF50';

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await userService.getActiveSessions();
      setSessions(response.data?.sessions || []);
    } catch (err) {
      console.error('Failed to load sessions:', err);
      showToast('Erreur lors du chargement des sessions', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRevokeSession = async (sessionId) => {
    if (!window.confirm('Voulez-vous vraiment révoquer cette session ?')) return;

    try {
      await userService.revokeSession(sessionId);
      showToast('Session révoquée avec succès', 'success');
      loadSessions();
    } catch (err) {
      console.error('Failed to revoke session:', err);
      showToast('Erreur lors de la révocation', 'error');
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm('Voulez-vous vraiment révoquer toutes les autres sessions ? Vous resterez connecté sur cet appareil.')) return;

    try {
      await userService.revokeAllOtherSessions();
      showToast('Toutes les autres sessions ont été révoquées', 'success');
      loadSessions();
    } catch (err) {
      console.error('Failed to revoke all sessions:', err);
      showToast('Erreur lors de la révocation', 'error');
    }
  };

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Inconnu';
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [language]);

  const getDeviceInfo = useCallback((userAgent) => {
    if (!userAgent) return { name: 'Appareil inconnu', icon: '💻' };
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return { name: 'Mobile', icon: '📱' };
    }
    if (userAgent.includes('Windows')) {
      return { name: 'Windows', icon: '🪟' };
    }
    if (userAgent.includes('Mac')) {
      return { name: 'Mac', icon: '🍎' };
    }
    if (userAgent.includes('Linux')) {
      return { name: 'Linux', icon: '🐧' };
    }
    return { name: 'Appareil', icon: '💻' };
  }, []);

  const getBrowserInfo = useCallback((userAgent) => {
    if (!userAgent) return 'Navigateur inconnu';
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      return 'Chrome';
    }
    if (userAgent.includes('Edg')) {
      return 'Edge';
    }
    if (userAgent.includes('Firefox')) {
      return 'Firefox';
    }
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      return 'Safari';
    }
    return 'Navigateur';
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: textSecondary }}>
        Chargement des sessions...
      </div>
    );
  }

  const currentSession = sessions.find(s => s.is_current);
  const otherSessions = sessions.filter(s => !s.is_current);

  return (
    <div style={{ padding: '24px', backgroundColor: bgColor, minHeight: '100vh' }}>
      {/* En-tête */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: textColor }}>
          🔐 Sessions Actives
        </h1>
        
        {otherSessions.length > 0 && (
          <button
            onClick={handleRevokeAll}
            style={{
              padding: '10px 20px',
              backgroundColor: dangerBg,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            🗑️ Révoquer toutes les autres sessions
          </button>
        )}
      </div>

      {/* Session actuelle */}
      {currentSession && (
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: cardBg,
          borderRadius: '12px',
          border: `2px solid ${successBg}`,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: textColor,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '24px' }}>{getDeviceInfo(currentSession.user_agent).icon}</span>
              Session Actuelle
            </h2>
            <span style={{
              padding: '4px 12px',
              backgroundColor: successBg,
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
            }}>
              ACTIVE
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginTop: '16px',
          }}>
            <div>
              <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '4px' }}>Appareil</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: textColor }}>
                {getDeviceInfo(currentSession.user_agent).name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '4px' }}>Navigateur</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: textColor }}>
                {getBrowserInfo(currentSession.user_agent)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '4px' }}>Adresse IP</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: textColor }}>
                {currentSession.ip_address || 'Inconnu'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '4px' }}>Créée le</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: textColor }}>
                {formatDate(currentSession.created_at)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '4px' }}>Expire le</div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: textColor }}>
                {formatDate(currentSession.expires_at)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Autres sessions */}
      {otherSessions.length > 0 && (
        <div>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '20px',
            fontWeight: '600',
            color: textColor,
          }}>
            Autres Sessions ({otherSessions.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {otherSessions.map((session) => {
              const deviceInfo = getDeviceInfo(session.user_agent);
              const browserInfo = getBrowserInfo(session.user_agent);

              return (
                <div
                  key={session.id}
                  style={{
                    padding: '16px',
                    backgroundColor: cardBg,
                    borderRadius: '12px',
                    border: `1px solid ${borderColor}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{
                      fontSize: '32px',
                      width: '48px',
                      height: '48px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: hoverBg,
                      borderRadius: '8px',
                    }}>
                      {deviceInfo.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontWeight: '600',
                        color: textColor,
                        marginBottom: '4px',
                        fontSize: '16px',
                      }}>
                        {deviceInfo.name} • {browserInfo}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: textSecondary,
                        marginBottom: '4px',
                      }}>
                        {session.ip_address || 'IP inconnue'} • Créée le {formatDate(session.created_at)}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: textSecondary,
                      }}>
                        Expire le {formatDate(session.expires_at)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: dangerBg,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    Révoquer
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: textSecondary,
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔐</div>
          <div style={{ fontSize: '18px', fontWeight: '500', marginBottom: '8px', color: textColor }}>
            Aucune session active
          </div>
          <div style={{ fontSize: '14px' }}>
            Vous n'avez actuellement aucune session active
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

