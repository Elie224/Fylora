import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';
import { userService, dashboardService } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import QuotaAlert from '../components/QuotaAlert';

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();
  const { t, setLanguage: setLang, language, supportedLanguages } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Profil
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Mot de passe
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  
  // Statistiques
  const [quotaUsed, setQuotaUsed] = useState(0);
  const [quotaLimit, setQuotaLimit] = useState(100 * 1024 * 1024 * 1024); // 100 Go par défaut (plan FREE)
  const [accountCreated, setAccountCreated] = useState('');
  const [lastLogin, setLastLogin] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const [userResponse, statsResponse] = await Promise.all([
        userService.getMe(),
        dashboardService.getStats()
      ]);
      
      const userData = userResponse.data.data;
      const stats = statsResponse.data.data;
      
      setEmail(userData.email || '');
      setDisplayName(userData.display_name || '');
      setAvatarUrl(userData.avatar_url || '');
      // Ne pas forcer la langue - utiliser celle de l'utilisateur
      setQuotaUsed(stats.quota?.used || 0);
      setQuotaLimit(stats.quota?.limit || 100 * 1024 * 1024 * 1024); // 100 Go par défaut (plan FREE)
      // Formater la date de création en français
      if (userData.created_at) {
        const createdDate = new Date(userData.created_at);
        setAccountCreated(createdDate.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }));
      } else {
        setAccountCreated('');
      }
      // Formater la dernière connexion avec l'heure en français
      if (userData.last_login_at) {
        const lastLoginDate = new Date(userData.last_login_at);
        setLastLogin(lastLoginDate.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }));
      } else {
        setLastLogin('Jamais');
      }
      
      // Mettre à jour le store
      if (setUser) {
        setUser({ ...userData, preferences: userData.preferences });
      }
    } catch (err) {
      showMessage('error', t('errorLoadingData'));
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await userService.updateProfile({ email, display_name: displayName });
      showMessage('success', t('profileUpdatedSuccess'));
      if (setUser && response.data.data) {
        setUser({ ...user, ...response.data.data });
      }
    } catch (err) {
      showMessage('error', 'Erreur: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showMessage('error', t('selectImage'));
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showMessage('error', t('imageMaxSize'));
      return;
    }
    
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_URL}/api/users/me/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: t('uploadError') } }));
        throw new Error(error.error?.message || t('uploadError'));
      }
      
      const data = await response.json();
      setAvatarUrl(data.data.avatar_url);
      showMessage('success', t('avatarUpdatedSuccess'));
      loadUserData();
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setSaving(false);
      e.target.value = ''; // Réinitialiser l'input
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      showMessage('error', t('passwordsDontMatch'));
      return;
    }
    
    if (newPassword.length < 8) {
      showMessage('error', t('passwordMinLength'));
      return;
    }
    
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await userService.changePassword(currentPassword, newPassword);
      showMessage('success', t('passwordChangedSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showMessage('error', 'Erreur: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      setSaving(false);
    }
  };


  // Calculer le pourcentage brut et formaté
  const quotaPercentageRaw = quotaLimit > 0 && quotaUsed > 0 ? (quotaUsed / quotaLimit) * 100 : 0;
  const quotaPercentage = quotaPercentageRaw < 1 
    ? Math.max(0.01, parseFloat(quotaPercentageRaw.toFixed(2)))
    : Math.round(quotaPercentageRaw);
  const quotaColor = quotaPercentageRaw >= 90 ? '#f44336' : quotaPercentageRaw >= 75 ? '#ff9800' : '#4caf50';

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>{t('loading')}</p>
      </div>
    );
  }

  // Couleurs dynamiques selon le thème - Thème clair amélioré
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
  const secondaryBg = theme === 'dark' ? '#2d2d2d' : '#f7fafc';
  const hoverBg = theme === 'dark' ? '#2d2d2d' : '#f0f4f8';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const bgColor = theme === 'dark' ? '#121212' : '#fafbfc';
  const shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';
  const shadowHover = theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.12)';

  return (
    <div style={{ 
      padding: 24, 
      maxWidth: 900, 
      margin: '0 auto',
      backgroundColor: bgColor,
      minHeight: '100vh'
    }}>
      <h1 style={{ marginBottom: 32, fontSize: '2em', color: textColor }}>⚙️ {t('settings')}</h1>

      {message.text && (
        <div style={{
          padding: 12,
          marginBottom: 24,
          backgroundColor: message.type === 'error' 
            ? (theme === 'dark' ? '#3d1f1f' : '#ffebee') 
            : (theme === 'dark' ? '#1f3d1f' : '#e8f5e9'),
          color: message.type === 'error' ? '#f44336' : '#4caf50',
          borderRadius: 8,
          border: `1px solid ${message.type === 'error' ? '#f44336' : '#4caf50'}`
        }}>
          {message.text}
        </div>
      )}

      {/* Alerte de quota (non intrusive) */}
      {quotaLimit > 0 && quotaUsed > 0 && (
        <QuotaAlert quota={{
          used: quotaUsed,
          limit: quotaLimit,
          percentage: (quotaUsed / quotaLimit) * 100
        }} />
      )}

      {/* Informations du compte */}
      <section style={{ 
        marginBottom: 32, 
        padding: 24, 
        backgroundColor: cardBg, 
        borderRadius: 12, 
        boxShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)',
        border: `1px solid ${borderColor}`
      }}>
        <h2 style={{ marginBottom: 20, fontSize: '1.5em', color: textColor }}>📊 {t('accountInfo')}</h2>
        
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative' }}>
            {avatarUrl ? (
              <img
                src={avatarUrl.startsWith('http') ? avatarUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${avatarUrl}`}
                alt="Avatar"
                style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #2196F3' }}
                onError={(e) => {
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email)}&size=80&background=2196F3&color=fff`;
                }}
              />
            ) : (
              <div style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: '#2196F3',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2em',
                fontWeight: 'bold'
              }}>
                {(displayName || email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <label style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: '#2196F3',
              color: 'white',
              borderRadius: '50%',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '2px solid white',
              fontSize: '14px'
            }}>
              📷
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                style={{ display: 'none' }}
                disabled={saving}
              />
            </label>
          </div>
          
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: textSecondary, fontSize: '0.9em' }}>{t('spaceUsed')}</strong>
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: textColor }}>
                    {formatBytes(quotaUsed)} / {formatBytes(quotaLimit)}
                  </span>
                  <span style={{ color: textSecondary }}>
                    {quotaPercentageRaw < 1 
                      ? quotaPercentageRaw.toFixed(2) 
                      : quotaPercentage}%
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: 12,
                  backgroundColor: theme === 'dark' ? '#2d2d2d' : '#e0e0e0',
                  borderRadius: 6,
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                <div style={{
                  width: `${quotaUsed > 0 ? Math.max(quotaPercentageRaw, 0.1) : 0}%`,
                  height: '100%',
                  backgroundColor: quotaColor,
                  transition: 'width 0.3s ease',
                  minWidth: quotaUsed > 0 ? '3px' : '0'
                }} />
              </div>
            </div>
            {/* Lien vers Pricing pour upgrade */}
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => navigate('/pricing')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1976D2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#2196F3';
                }}
              >
                <span>💳</span>
                {t('upgrade') || 'Mettre à niveau'}
              </button>
            </div>
          </div>
        </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <strong style={{ color: textSecondary, fontSize: '0.9em' }}>{t('accountCreated')}</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.1em', color: textColor }}>{accountCreated || 'N/A'}</p>
          </div>
          <div>
            <strong style={{ color: textSecondary, fontSize: '0.9em' }}>{t('lastLogin')}</strong>
            <p style={{ margin: '4px 0 0 0', fontSize: '1.1em', color: textColor }}>{lastLogin}</p>
          </div>
        </div>
      </section>

      {/* Profil */}
      <section style={{ 
        marginBottom: 32, 
        padding: 24, 
        backgroundColor: cardBg, 
        borderRadius: 12, 
        boxShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)',
        border: `1px solid ${borderColor}`
      }}>
        <h2 style={{ marginBottom: 20, fontSize: '1.5em', color: textColor }}>👤 {t('profile')}</h2>
        <form onSubmit={handleUpdateProfile}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: textColor }}>{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                padding: 12,
                width: '100%',
                maxWidth: 400,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: '1em',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor
              }}
              required
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: textColor }}>{t('displayName')}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('yourName')}
              style={{
                padding: 12,
                width: '100%',
                maxWidth: 400,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: '1em',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor
              }}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '12px 24px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '1em',
              fontWeight: 'bold',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? t('saving') : t('saveChanges')}
          </button>
        </form>
      </section>

      {/* Mot de passe */}
      <section style={{ 
        marginBottom: 32, 
        padding: 24, 
        backgroundColor: cardBg, 
        borderRadius: 12, 
        boxShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)',
        border: `1px solid ${borderColor}`
      }}>
        <h2 style={{ marginBottom: 20, fontSize: '1.5em', color: textColor }}>🔒 {t('security')}</h2>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: textColor }}>{t('currentPassword')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{
                padding: 12,
                width: '100%',
                maxWidth: 400,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: '1em',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor
              }}
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: textColor }}>{t('newPassword')}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                padding: 12,
                width: '100%',
                maxWidth: 400,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: '1em',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor
              }}
              required
              minLength={8}
              placeholder={t('passwordMinLength')}
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold', color: textColor }}>{t('confirmPassword')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                padding: 12,
                width: '100%',
                maxWidth: 400,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: '1em',
                backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                color: textColor
              }}
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '1em',
              fontWeight: 'bold',
              opacity: saving ? 0.6 : 1
            }}
          >
            {saving ? t('saving') : t('changePassword')}
          </button>
        </form>
      </section>

      {/* Préférences d'interface */}
      <section style={{ 
        marginBottom: 32, 
        padding: 24, 
        backgroundColor: cardBg, 
        borderRadius: 12, 
        boxShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)',
        border: `1px solid ${borderColor}`
      }}>
        <h2 style={{ marginBottom: 20, fontSize: '1.5em', color: textColor }}>🎨 {t('interfacePreferences') || 'Préférences d\'interface'}</h2>
        
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '16px',
            backgroundColor: secondaryBg,
            borderRadius: 8,
            border: `1px solid ${borderColor}`
          }}>
            <div>
              <div style={{ fontWeight: 'bold', marginBottom: 4, color: textColor }}>
                {t('theme') || 'Thème'}
              </div>
              <div style={{ fontSize: '0.9em', color: textSecondary }}>
                {theme === 'dark' ? (t('darkTheme') || 'Thème sombre') : (t('lightTheme') || 'Thème clair')}
              </div>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                padding: '10px 20px',
                backgroundColor: theme === 'dark' ? '#424242' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#616161' : '#1976D2';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = theme === 'dark' ? '#424242' : '#2196F3';
              }}
            >
              {theme === 'dark' ? '🌙' : '☀️'}
              {theme === 'dark' ? (t('switchToLight') || 'Passer au thème clair') : (t('switchToDark') || 'Passer au thème sombre')}
            </button>
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '16px',
            backgroundColor: secondaryBg,
            borderRadius: 8,
            border: `1px solid ${borderColor}`
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8, color: textColor }}>
                {t('language') || 'Langue'}
              </div>
              <select
                value={language}
                onChange={(e) => setLang(e.target.value)}
                style={{
                  padding: '10px 16px',
                  width: '100%',
                  maxWidth: 300,
                  border: `1px solid ${borderColor}`,
                  borderRadius: 8,
                  fontSize: '1em',
                  backgroundColor: theme === 'dark' ? '#2d2d2d' : '#ffffff',
                  color: textColor,
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2196F3';
                  e.target.style.boxShadow = '0 0 0 3px rgba(33, 150, 243, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = borderColor;
                  e.target.style.boxShadow = 'none';
                }}
              >
                {Object.values(supportedLanguages).map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.nativeName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Déconnexion */}
      <section style={{ 
        padding: 24, 
        backgroundColor: theme === 'dark' ? '#2d1f0f' : '#fff3e0', 
        borderRadius: 12, 
        boxShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.1)',
        border: `1px solid ${borderColor}`
      }}>
        <h2 style={{ marginBottom: 20, fontSize: '1.5em', color: textColor }}>🚪 {t('logout')}</h2>
        <p style={{ marginBottom: 16, color: textSecondary }}>
          {t('youCanLogoutAnytime')}
        </p>
        <button
          onClick={logout}
          style={{
            padding: '12px 24px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '1em',
            fontWeight: 'bold'
          }}
        >
          {t('logout')}
        </button>
      </section>
    </div>
  );
}
