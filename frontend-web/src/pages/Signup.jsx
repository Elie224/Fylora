import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { countries, getCountryByCode } from '../utils/countries';

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('FR'); // France par défaut
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuthStore();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  
  // Détecter la taille de l'écran pour le responsive
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const isMobile = windowWidth < 768;

  // Couleurs dynamiques selon le thème - Thème clair amélioré
  const bgColor = theme === 'dark' ? '#0a0a0a' : '#fafbfc';
  const cardBg = theme === 'dark' ? '#1a1a1a' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const textSecondary = theme === 'dark' ? '#b0b0b0' : '#4a5568';
  const borderColor = theme === 'dark' ? '#2d2d2d' : '#e2e8f0';
  const inputBg = theme === 'dark' ? '#2d2d2d' : '#ffffff';
  const inputBorder = theme === 'dark' ? '#404040' : '#cbd5e0';
  const errorBg = theme === 'dark' ? '#3d1f1f' : '#fef2f2';
  const errorText = theme === 'dark' ? '#ff6b6b' : '#dc2626';
  const primaryColor = '#2196F3';
  const separatorColor = theme === 'dark' ? '#2d2d2d' : '#e2e8f0';
  const shadowColor = theme === 'dark' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)';

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return t('passwordMinLength');
    if (!/[A-Z]/.test(pwd)) return t('passwordRequiresUppercase');
    if (!/[0-9]/.test(pwd)) return t('passwordRequiresNumber');
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!firstName || !lastName || !email || !countryCode || !password || !confirmPassword) {
      setError(t('fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('passwordsDontMatch'));
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    const country = getCountryByCode(countryCode);
    const countryName = country ? country.name : countryCode;

    try {
      const result = await signup(email, password, firstName, lastName, undefined, countryName);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || t('signupFailed'));
      }
    } catch (err) {
      console.error('Signup error:', err);
      const errorMessage = err.response?.data?.error?.message || 
                          err.response?.data?.error?.details?.[0]?.msg ||
                          err.message || 
                          t('signupFailed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      backgroundColor: bgColor,
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{
        backgroundColor: cardBg,
        padding: isMobile ? '24px' : '32px',
        borderRadius: '12px',
              boxShadow: theme === 'dark' ? '0 4px 20px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
        width: '100%',
        maxWidth: isMobile ? '95%' : '400px',
        margin: isMobile ? '16px' : '0',
        border: `1px solid ${borderColor}`,
        transition: 'all 0.3s ease'
      }}>
        <div style={{ marginBottom: '16px', textAlign: 'left' }}>
          <Link 
            to="/" 
            style={{ 
              color: primaryColor, 
              textDecoration: 'none',
              fontSize: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            ← {t('backToHome')}
          </Link>
        </div>
        <h1 style={{ marginBottom: '24px', textAlign: 'center', color: textColor }}>
          {t('signup')}
        </h1>

        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: errorBg,
            color: errorText,
            borderRadius: '8px',
            fontSize: '14px',
            border: `1px solid ${theme === 'dark' ? '#5d2f2f' : '#ffcdd2'}`
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontWeight: '500' }}>
              {t('firstName')}
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                backgroundColor: inputBg,
                color: textColor,
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = primaryColor;
                e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = borderColor;
                e.target.style.boxShadow = 'none';
              }}
              required
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontWeight: '500' }}>
              {t('lastName')}
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                backgroundColor: inputBg,
                color: textColor,
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = primaryColor;
                e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = borderColor;
                e.target.style.boxShadow = 'none';
              }}
              required
              disabled={loading}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontWeight: '500' }}>
              {t('country')}
            </label>
            <select
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
              }}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                backgroundColor: inputBg,
                color: textColor,
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = primaryColor;
                e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = borderColor;
                e.target.style.boxShadow = 'none';
              }}
              required
              disabled={loading}
            >
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontWeight: '500' }}>
              {t('email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                backgroundColor: inputBg,
                color: textColor,
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = primaryColor;
                e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = borderColor;
                e.target.style.boxShadow = 'none';
              }}
              required
              disabled={loading}
            />
          </div>


          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontWeight: '500' }}>
              {t('password')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                style={{
                  width: '100%',
                  padding: '12px 48px 12px 12px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  backgroundColor: inputBg,
                  color: textColor,
                  transition: 'all 0.2s',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  touchAction: 'manipulation'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = primaryColor;
                  e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = borderColor;
                  e.target.style.boxShadow = 'none';
                }}
                required
                disabled={loading}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: textSecondary,
                  fontSize: '18px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s',
                  zIndex: 2,
                  outline: 'none',
                  minWidth: '32px',
                  minHeight: '32px',
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
                onMouseEnter={(e) => e.target.style.color = textColor}
                onMouseLeave={(e) => e.target.style.color = textSecondary}
                disabled={loading}
                tabIndex={-1}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <div style={{ marginTop: '4px', fontSize: '12px', color: textSecondary }}>
              {t('passwordRequirements')}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontWeight: '500' }}>
              {t('confirmPassword')}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                style={{
                  width: '100%',
                  padding: '12px 48px 12px 12px',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  backgroundColor: inputBg,
                  color: textColor,
                  transition: 'all 0.2s',
                  outline: 'none',
                  WebkitAppearance: 'none',
                  appearance: 'none',
                  touchAction: 'manipulation'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = primaryColor;
                  e.target.style.boxShadow = `0 0 0 3px ${primaryColor}20`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = borderColor;
                  e.target.style.boxShadow = 'none';
                }}
                required
                disabled={loading}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowConfirmPassword(!showConfirmPassword);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPassword(!showPassword);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: textSecondary,
                  fontSize: '18px',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color 0.2s',
                  zIndex: 2,
                  outline: 'none',
                  minWidth: '32px',
                  minHeight: '32px',
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none'
                }}
                onMouseEnter={(e) => e.target.style.color = textColor}
                onMouseLeave={(e) => e.target.style.color = textSecondary}
                disabled={loading}
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Masquer la confirmation du mot de passe' : 'Afficher la confirmation du mot de passe'}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? (theme === 'dark' ? '#444' : '#ccc') : primaryColor,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '16px',
              transition: 'all 0.2s',
              boxShadow: loading ? 'none' : `0 4px 12px ${primaryColor}40`
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = `0 6px 16px ${primaryColor}50`;
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = `0 4px 12px ${primaryColor}40`;
              }
            }}
          >
            {loading ? t('signupLoading') : t('signupButton')}
          </button>
        </form>

        {/* Séparateur */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: textSecondary }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: separatorColor }}></div>
          <span style={{ padding: '0 16px', fontSize: '14px' }}>{t('or')}</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: separatorColor }}></div>
        </div>

        {/* Boutons OAuth */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => {
              const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
              window.location.href = `${apiUrl}/api/auth/google`;
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: theme === 'dark' ? '#2d2d2d' : '#fff',
              color: theme === 'dark' ? '#e0e0e0' : '#333',
              border: '2px solid #4285f4',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxShadow: theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? '#3d3d3d' : '#f8f9fa';
              e.target.style.borderColor = '#1a73e8';
              e.target.style.boxShadow = theme === 'dark' ? '0 4px 8px rgba(0,0,0,0.5)' : '0 4px 8px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? '#2d2d2d' : '#fff';
              e.target.style.borderColor = '#4285f4';
              e.target.style.boxShadow = theme === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg          >
            <span>{t('continueWith')} Google</span>
          </button>
        </div>

        <div style={{ textAlign: 'center', color: textSecondary, fontSize: '14px' }}>
          {t('hasAccount')}{' '}
          <Link 
            to="/login" 
            style={{ 
              color: primaryColor, 
              textDecoration: 'none',
              fontWeight: '500',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            {t('loginLink')}
          </Link>
        </div>
      </div>
    </div>
  );
}



