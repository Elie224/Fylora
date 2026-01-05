import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';
import { dashboardService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import QuotaAlert from '../components/QuotaAlert';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  
  // Couleurs dynamiques selon le thème - Thème clair amélioré
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const bgColor = theme === 'dark' ? '#121212' : '#fafbfc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f7fafc';
  const shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';
  const shadowHover = theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.12)';

  // Gérer la déconnexion automatique
  useEffect(() => {
    const handleLogout = async () => {
      await logout();
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [logout, navigate]);

  // Memoization de la fonction de chargement
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Vérifier que l'utilisateur est bien chargé
      if (!user) {
        // Attendre un peu que l'utilisateur soit chargé
        await new Promise(resolve => setTimeout(resolve, 500));
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          setError(t('mustBeConnected') || 'Vous devez être connecté');
          setLoading(false);
          return;
        }
      }
      
      const response = await dashboardService.getStats();
      
      // Vérifier la structure de la réponse
      if (!response || !response.data) {
        throw new Error('Invalid response structure');
      }
      
      setStats(response.data.data || response.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      
      // Si c'est une erreur 401, laisser l'intercepteur gérer (il va rafraîchir le token)
      if (err.response?.status === 401) {
        // L'intercepteur va gérer le refresh et la redirection si nécessaire
        // Ne pas afficher d'erreur ici
        setLoading(false);
        return;
      }
      
      // Pour les autres erreurs, afficher un message
      setError(err.response?.data?.error?.message || err.message || t('loadError') || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [t, user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Memoization de formatBytes
  const formatBytes = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }, []);

  // Memoization des fichiers récents
  const recentFiles = useMemo(() => {
    return stats?.recent_files || [];
  }, [stats?.recent_files]);

  if (loading) {
    return (
      <div style={{ 
        padding: '24px 16px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '200px'
      }}>
        <div style={{ fontSize: '16px', color: '#666' }}>{t('loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '24px 16px', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '200px'
      }}>
        <div style={{ fontSize: '18px', color: '#d32f2f', marginBottom: '16px' }}>⚠️ {error}</div>
        <button
          onClick={() => loadDashboard()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {t('retry') || 'Réessayer'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '16px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: theme === 'dark' ? '#121212' : 'transparent',
      minHeight: '100vh'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          margin: 0,
          color: textColor
        }}>
          {t('dashboard')}
        </h1>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {user?.is_admin && (
            <button
              onClick={() => navigate('/admin')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(156, 39, 176, 0.3)',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#7B1FA2';
                e.target.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#9C27B0';
                e.target.style.boxShadow = '0 2px 8px rgba(156, 39, 176, 0.3)';
              }}
            >
              <span style={{ fontSize: '20px' }}>⚙️</span>
              {t('administration')}
            </button>
          )}
          <button
            onClick={() => navigate('/files')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1976D2';
              e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#2196F3';
              e.target.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.3)';
            }}
          >
            <span style={{ fontSize: '20px' }}>📁</span>
            {t('myFiles')}
          </button>
        </div>
      </div>
      
      {stats && (
        <>
          {/* Alerte de quota (non intrusive) */}
          {stats.quota && <QuotaAlert quota={stats.quota} />}
          
          {/* Quota avec évolution - Design amélioré */}
          <div style={{ 
            marginBottom: '24px', 
            padding: '28px', 
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: `1px solid ${borderColor}`, 
            borderRadius: '20px',
            boxShadow: theme === 'dark' 
              ? '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
              : '0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Effet de brillance décoratif */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: theme === 'dark'
                ? 'radial-gradient(circle, rgba(33,150,243,0.1) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(33,150,243,0.05) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}></div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '12px',
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: '0 4px 12px rgba(33,150,243,0.3)'
                }}>
                  💾
                </div>
                <div>
                  <h2 style={{ 
                    fontSize: '22px', 
                    fontWeight: '700', 
                    margin: 0,
                    color: textColor,
                    letterSpacing: '-0.5px'
                  }}>
                    {t('storageSpace')}
                  </h2>
                  <div style={{ 
                    fontSize: '13px', 
                    color: textSecondary,
                    marginTop: '4px'
                  }}>
                    {formatBytes(stats.quota.limit)} {t('total')}
                  </div>
                </div>
              </div>
              {/* Lien vers Pricing pour upgrade */}
              <button
                onClick={() => navigate('/pricing')}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1976D2';
                  e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#2196F3';
                  e.target.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.3)';
                }}
              >
                <span style={{ fontSize: '18px' }}>💳</span>
                {t('upgrade') || 'Mettre à niveau'}
              </button>
            </div>
            
            {/* Graphique d'évolution amélioré (7 derniers jours) */}
            <div style={{ 
              marginBottom: '24px',
              padding: '20px',
              background: theme === 'dark' 
                ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
                : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
              borderRadius: '16px',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600',
                color: textColor,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '18px' }}>📊</span>
                {t('storageEvolution') || 'Évolution de l\'espace utilisé (7 derniers jours)'}
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: '120px',
                gap: '8px',
                padding: '12px 0'
              }}>
                {[6, 5, 4, 3, 2, 1, 0].map((dayOffset) => {
                  // Simulation réaliste de l'évolution (croissance progressive)
                  // En production, récupérer les données historiques depuis le backend
                  const daysAgo = dayOffset;
                  const baseUsage = stats.quota.used;
                  // Simulation : croissance de 2-5% par jour en moyenne
                  const growthFactor = 1 - (daysAgo * 0.03); // Diminution de 3% par jour dans le passé
                  const dayUsage = Math.max(0, baseUsage * growthFactor);
                  const heightPercent = stats.quota.limit > 0 
                    ? Math.max(5, Math.min(100, (dayUsage / stats.quota.limit) * 100))
                    : 5;
                  
                  const days = language === 'en' 
                    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                    : ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                  const today = new Date();
                  const targetDate = new Date(today);
                  targetDate.setDate(today.getDate() - daysAgo);
                  const dayIndex = targetDate.getDay();
                  const isToday = daysAgo === 0;
                  
                  return (
                    <div key={dayOffset} style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title={formatBytes(dayUsage)}
                    >
                      <div style={{ 
                        width: '100%',
                        height: `${heightPercent}%`,
                        minHeight: '12px',
                        background: isToday 
                          ? 'linear-gradient(180deg, #4CAF50 0%, #45a049 100%)'
                          : 'linear-gradient(180deg, #2196F3 0%, #1976D2 100%)',
                        borderRadius: '8px 8px 0 0',
                        transition: 'all 0.3s ease',
                        opacity: isToday ? 1 : 0.7,
                        boxShadow: isToday 
                          ? '0 4px 12px rgba(76, 175, 80, 0.4), inset 0 -2px 4px rgba(0,0,0,0.1)'
                          : '0 2px 8px rgba(33, 150, 243, 0.3)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {/* Effet de brillance sur les barres */}
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '30%',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
                          borderRadius: '8px 8px 0 0'
                        }}></div>
                      </div>
                      <div style={{ 
                        fontSize: '10px', 
                        color: textSecondary,
                        marginTop: '6px',
                        textAlign: 'center',
                        fontWeight: isToday ? '600' : '400'
                      }}>
                        {days[dayIndex]}
                      </div>
                      {isToday && (
                        <div style={{ 
                          fontSize: '9px', 
                          color: '#4CAF50',
                          marginTop: '2px',
                          fontWeight: '600'
                        }}>
                          Aujourd'hui
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ marginTop: '20px', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div style={{
                  padding: '16px',
                  background: theme === 'dark' 
                    ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
                    : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                  borderRadius: '12px',
                  border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                }}>
                  <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '6px', fontWeight: '500' }}>
                    {t('used')}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#4CAF50' }}>
                    {formatBytes(stats.quota.used)}
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: theme === 'dark' 
                    ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
                    : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                  borderRadius: '12px',
                  border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                }}>
                  <div style={{ fontSize: '12px', color: textSecondary, marginBottom: '6px', fontWeight: '500' }}>
                    {t('available')}
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#2196F3' }}>
                    {formatBytes(stats.quota.available)}
                  </div>
                </div>
              </div>
              <div style={{ 
                width: '100%', 
                height: '36px', 
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
                  : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                borderRadius: '18px', 
                overflow: 'hidden',
                boxShadow: theme === 'dark' 
                  ? 'inset 0 4px 8px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)'
                  : 'inset 0 4px 8px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)',
                position: 'relative',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
              }}>
                {(() => {
                  const percentageRaw = stats.quota.percentageRaw || stats.quota.percentage || 0;
                  // Pour les très petits pourcentages, utiliser une largeur minimale visible
                  // Calculer la largeur en pourcentage avec un minimum de 0.1% pour la visibilité
                  const barWidth = stats.quota.used > 0 
                    ? Math.max(percentageRaw, 0.1)
                    : 0;
                  const barGradient = percentageRaw > 80 
                    ? 'linear-gradient(90deg, #f44336 0%, #d32f2f 100%)'
                    : percentageRaw > 75 
                    ? 'linear-gradient(90deg, #ff9800 0%, #f57c00 100%)'
                    : 'linear-gradient(90deg, #4CAF50 0%, #45a049 100%)';
                  
                  return (
                    <div
                      style={{
                        width: `${barWidth}%`,
                        height: '100%',
                        background: barGradient,
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderRadius: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        paddingRight: '12px',
                        minWidth: stats.quota.used > 0 ? '4px' : '0',
                        boxShadow: stats.quota.used > 0 
                          ? '0 2px 8px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(0,0,0,0.1)'
                          : 'none',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Effet de brillance */}
                      {stats.quota.used > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '40%',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)',
                          borderRadius: '18px'
                        }}></div>
                      )}
                      {percentageRaw > 5 && (
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: '700', 
                          color: 'white',
                          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                          position: 'relative',
                          zIndex: 1
                        }}>
                          {stats.quota.percentage < 1 
                            ? stats.quota.percentage.toFixed(2) 
                            : stats.quota.percentage}%
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div style={{ 
                marginTop: '12px', 
                fontSize: '14px', 
                color: textSecondary,
                textAlign: 'center',
                fontWeight: '500'
              }}>
                <span style={{ color: textColor, fontWeight: '600' }}>
                  {stats.quota.percentage < 1 
                    ? stats.quota.percentage.toFixed(2) 
                    : stats.quota.percentage}%
                </span> {t('usedOf')} <span style={{ color: textColor, fontWeight: '600' }}>{formatBytes(stats.quota.limit)}</span>
              </div>
            </div>
          </div>

          {/* Répartition avec graphique - Design amélioré */}
          <div style={{ 
            marginBottom: '24px', 
            padding: '28px', 
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: `1px solid ${borderColor}`, 
            borderRadius: '20px',
            boxShadow: theme === 'dark' 
              ? '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
              : '0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Effet de brillance décoratif */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: theme === 'dark'
                ? 'radial-gradient(circle, rgba(76,175,80,0.1) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(76,175,80,0.05) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}></div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: '0 4px 12px rgba(76,175,80,0.3)'
              }}>
                📊
              </div>
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                margin: 0,
                color: textColor,
                letterSpacing: '-0.5px'
              }}>
                {t('breakdownByType')}
              </h2>
            </div>
            <div style={{ marginTop: '16px' }}>
              {/* Graphique en barres horizontales */}
              {[
                { key: 'images', label: t('images'), color: '#4CAF50', value: stats.breakdown.images },
                { key: 'videos', label: t('videos'), color: '#2196F3', value: stats.breakdown.videos },
                { key: 'documents', label: t('documents'), color: '#FF9800', value: stats.breakdown.documents },
                { key: 'audio', label: t('audio'), color: '#9C27B0', value: stats.breakdown.audio },
                { key: 'other', label: t('others'), color: '#607D8B', value: stats.breakdown.other }
              ].map((item) => {
                const percentage = stats.breakdown.total > 0 ? (item.value / stats.breakdown.total * 100) : 0;
                return (
                  <div key={item.key} style={{ marginBottom: '16px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: '500',
                        color: textColor,
                        minWidth: '80px'
                      }}>
                        {item.label}
                      </span>
                      <span style={{ 
                        fontSize: '13px', 
                        color: textSecondary,
                        fontWeight: '500'
                      }}>
                        {formatBytes(item.value)}
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '28px', 
                      background: theme === 'dark' 
                        ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
                        : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                      borderRadius: '14px', 
                      position: 'relative', 
                      overflow: 'hidden',
                      boxShadow: theme === 'dark' 
                        ? 'inset 0 4px 8px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)'
                        : 'inset 0 4px 8px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.05)',
                      border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                    }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}dd 100%)`,
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderRadius: '14px',
                        minWidth: percentage > 0 ? '6px' : '0',
                        boxShadow: percentage > 0 
                          ? '0 2px 8px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(0,0,0,0.1)'
                          : 'none',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {/* Effet de brillance */}
                        {percentage > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '40%',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 100%)',
                            borderRadius: '14px'
                          }}></div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fichiers récents - Design amélioré */}
          <div style={{ 
            marginBottom: '24px', 
            padding: '28px', 
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: `1px solid ${borderColor}`, 
            borderRadius: '20px',
            boxShadow: theme === 'dark' 
              ? '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
              : '0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Effet de brillance décoratif */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: theme === 'dark'
                ? 'radial-gradient(circle, rgba(255,152,0,0.1) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(255,152,0,0.05) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}></div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #FF9800 0%, #f57c00 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: '0 4px 12px rgba(255,152,0,0.3)'
                }}>
                  📄
                </div>
                <h2 style={{ 
                  fontSize: '22px', 
                  fontWeight: '700', 
                  margin: 0,
                  color: textColor,
                  letterSpacing: '-0.5px'
                }}>
                  {t('recentFiles')}
                </h2>
              </div>
              <button
                onClick={() => navigate('/files')}
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#1976D2',
                  color: '#FFFFFF',
                  border: '2px solid #1976D2',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '700',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(25, 118, 210, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  whiteSpace: 'nowrap',
                  minWidth: '140px',
                  justifyContent: 'center',
                  textTransform: 'none',
                  letterSpacing: '0.3px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1565C0';
                  e.currentTarget.style.borderColor = '#1565C0';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(25, 118, 210, 0.6)';
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1976D2';
                  e.currentTarget.style.borderColor = '#1976D2';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.5)';
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                }}
              >
                <span style={{ fontWeight: '700', fontSize: '16px' }}>{t('viewAll')}</span>
                <span style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: '1' }}>→</span>
              </button>
            </div>
            {stats.recent_files && stats.recent_files.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {stats.recent_files.map((file, index) => (
                  <li 
                    key={file.id} 
                    style={{ 
                      padding: '12px 0', 
                      borderBottom: index < stats.recent_files.length - 1 ? `1px solid ${borderColor}` : 'none',
                      fontSize: '14px',
                      color: textColor
                    }}
                  >
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>{file.name}</div>
                    <div style={{ fontSize: '12px', color: textSecondary }}>
                      {formatBytes(file.size)} • {new Date(file.updated_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#999', fontSize: '14px', textAlign: 'center', padding: '20px 0' }}>
                {t('noRecentFiles')}
              </p>
            )}
          </div>

          {/* Statistiques générales - Design amélioré */}
          <div style={{ 
            padding: '28px', 
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: `1px solid ${borderColor}`, 
            borderRadius: '20px',
            boxShadow: theme === 'dark' 
              ? '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
              : '0 8px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Effet de brillance décoratif */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-50%',
              width: '200%',
              height: '200%',
              background: theme === 'dark'
                ? 'radial-gradient(circle, rgba(156,39,176,0.1) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(156,39,176,0.05) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}></div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: '0 4px 12px rgba(156,39,176,0.3)'
              }}>
                📈
              </div>
              <h2 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                margin: 0,
                color: textColor,
                letterSpacing: '-0.5px'
              }}>
                {t('statistics')}
              </h2>
            </div>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '20px',
              position: 'relative',
              zIndex: 1
            }}>
              {/* Total fichiers */}
              <div style={{
                padding: '24px',
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
                  : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                borderRadius: '16px',
                textAlign: 'center',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                boxShadow: theme === 'dark' 
                  ? '0 4px 12px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = theme === 'dark' 
                  ? '0 8px 20px rgba(33,150,243,0.4)'
                  : '0 8px 20px rgba(33,150,243,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme === 'dark' 
                  ? '0 4px 12px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.08)';
              }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'radial-gradient(circle, rgba(33,150,243,0.2) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}></div>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>📄</div>
                <div style={{ 
                  fontSize: '36px', 
                  fontWeight: '700', 
                  background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '8px',
                  lineHeight: '1.2'
                }}>
                  {stats?.total_files ?? 0}
                </div>
                <div style={{ fontSize: '14px', color: textSecondary, fontWeight: '500' }}>
                  {t('totalFiles') || 'Fichiers'}
                </div>
              </div>

              {/* Total dossiers */}
              <div style={{
                padding: '24px',
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
                  : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                borderRadius: '16px',
                textAlign: 'center',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                boxShadow: theme === 'dark' 
                  ? '0 4px 12px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = theme === 'dark' 
                  ? '0 8px 20px rgba(76,175,80,0.4)'
                  : '0 8px 20px rgba(76,175,80,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme === 'dark' 
                  ? '0 4px 12px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.08)';
              }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'radial-gradient(circle, rgba(76,175,80,0.2) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}></div>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>📁</div>
                <div style={{ 
                  fontSize: '36px', 
                  fontWeight: '700', 
                  background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '8px',
                  lineHeight: '1.2'
                }}>
                  {stats?.total_folders ?? 0}
                </div>
                <div style={{ fontSize: '14px', color: textSecondary, fontWeight: '500' }}>
                  {t('totalFolders') || 'Dossiers'}
                </div>
              </div>

              {/* Fichiers récents */}
              <div style={{
                padding: '24px',
                background: theme === 'dark' 
                  ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
                  : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                borderRadius: '16px',
                textAlign: 'center',
                border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                boxShadow: theme === 'dark' 
                  ? '0 4px 12px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = theme === 'dark' 
                  ? '0 8px 20px rgba(255,152,0,0.4)'
                  : '0 8px 20px rgba(255,152,0,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme === 'dark' 
                  ? '0 4px 12px rgba(0,0,0,0.3)'
                  : '0 4px 12px rgba(0,0,0,0.08)';
              }}
              >
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  background: 'radial-gradient(circle, rgba(255,152,0,0.2) 0%, transparent 70%)',
                  pointerEvents: 'none'
                }}></div>
                <div style={{ fontSize: '28px', marginBottom: '12px' }}>🕒</div>
                <div style={{ 
                  fontSize: '36px', 
                  fontWeight: '700', 
                  background: 'linear-gradient(135deg, #FF9800 0%, #f57c00 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '8px',
                  lineHeight: '1.2'
                }}>
                  {stats?.recent_files?.length ?? 0}
                </div>
                <div style={{ fontSize: '14px', color: textSecondary, fontWeight: '500' }}>
                  {t('recentFiles') || 'Fichiers récents'}
                </div>
              </div>

              {/* Espace utilisé */}
              {stats?.quota && (
                <div style={{
                  padding: '24px',
                  background: theme === 'dark' 
                    ? 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)'
                    : 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                  borderRadius: '16px',
                  textAlign: 'center',
                  border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                  boxShadow: theme === 'dark' 
                    ? '0 4px 12px rgba(0,0,0,0.3)'
                    : '0 4px 12px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = theme === 'dark' 
                    ? '0 8px 20px rgba(156,39,176,0.4)'
                    : '0 8px 20px rgba(156,39,176,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = theme === 'dark' 
                    ? '0 4px 12px rgba(0,0,0,0.3)'
                    : '0 4px 12px rgba(0,0,0,0.08)';
                }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '80px',
                    height: '80px',
                    background: 'radial-gradient(circle, rgba(156,39,176,0.2) 0%, transparent 70%)',
                    pointerEvents: 'none'
                  }}></div>
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>💾</div>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    background: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '8px',
                    lineHeight: '1.2'
                  }}>
                    {stats.quota.percentage < 1 
                      ? stats.quota.percentage.toFixed(2) 
                      : stats.quota.percentage}%
                  </div>
                  <div style={{ fontSize: '14px', color: textSecondary, fontWeight: '500' }}>
                    {t('used') || 'Utilisé'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

