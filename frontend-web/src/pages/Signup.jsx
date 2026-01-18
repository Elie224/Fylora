import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../services/authStore';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { countries, getCountryByCode } from '../utils/countries';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { API_URL } from '../config';

// Composant interne pour gérer Stripe Elements
function SignupFormInner() {
  const stripe = useStripe();
  const elements = useElements();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('FR'); // France par défaut
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stripePublishableKey, setStripePublishableKey] = useState(null);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const [cardVerified, setCardVerified] = useState(false);
  const [stripeCustomerId, setStripeCustomerId] = useState(null);
  const [verifyingCard, setVerifyingCard] = useState(false);
  
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

  // Charger la clé Stripe publishable
  useEffect(() => {
    const loadStripeKey = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/stripe-publishable-key`);
        if (response.ok) {
          const data = await response.json();
          setStripePublishableKey(data.data.publishableKey);
        } else {
          console.error('Stripe not configured');
          setError(language === 'fr' ? 'La vérification de carte n\'est pas disponible. Veuillez contacter le support.' : 'Card verification is not available. Please contact support.');
        }
      } catch (err) {
        console.error('Failed to load Stripe key:', err);
      }
    };
    loadStripeKey();
  }, []);

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
    if (!pwd || pwd.length === 0) return null; // Ne pas valider si vide (sera validé à la soumission)
    if (pwd.length < 8) return t('passwordMinLength');
    if (!/[A-Z]/.test(pwd)) return t('passwordRequiresUppercase');
    if (!/[0-9]/.test(pwd)) return t('passwordRequiresNumber');
    return null;
  };

  // Validation en temps réel du mot de passe
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    const passwordErr = validatePassword(value);
    setPasswordError(passwordErr || '');
    // Valider aussi la correspondance si confirmPassword existe
    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError(t('passwordsDontMatch'));
    } else if (confirmPassword && value === confirmPassword) {
      setConfirmPasswordError('');
    }
  };

  // Validation en temps réel de la confirmation
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (password && value !== password) {
      setConfirmPasswordError(t('passwordsDontMatch'));
    } else {
      setConfirmPasswordError('');
    }
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

    // Vérifier que Stripe est chargé
    if (!stripe || !elements) {
      setError(language === 'fr' ? 'Chargement de Stripe en cours... Veuillez patienter.' : 'Loading Stripe... Please wait.');
      return;
    }

    // Vérifier la carte bancaire avant l'inscription (comme Render - aucun prélèvement)
    setVerifyingCard(true);
    setError('');

    try {
      // Créer un PaymentMethod à partir des données de la carte
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error(language === 'fr' ? 'Veuillez saisir vos informations de carte bancaire.' : 'Please enter your card information.');
      }

      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError) {
        throw new Error(pmError.message || (language === 'fr' ? 'Erreur lors de la vérification de la carte. Veuillez vérifier les informations saisies.' : 'Error verifying card. Please check your card information.'));
      }

      if (!paymentMethod) {
        throw new Error(language === 'fr' ? 'Impossible de créer la méthode de paiement.' : 'Unable to create payment method.');
      }

      // Vérifier la carte côté serveur (sans prélèvement - Setup Intent)
      const verifyResponse = await fetch(`${API_URL}/api/auth/verify-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          paymentMethodId: paymentMethod.id,
          firstName,
          lastName,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error?.message || (language === 'fr' ? 'La vérification de la carte a échoué. Cette carte a peut-être déjà été utilisée.' : 'Card verification failed. This card may have already been used.'));
      }

      // Carte vérifiée avec succès - stocker le customerId
      const customerId = verifyData.data.customerId;
      setStripeCustomerId(customerId);
      setCardVerified(true);

      // Maintenant procéder à l'inscription avec le stripeCustomerId
      setLoading(true);

      const country = getCountryByCode(countryCode);
      const countryName = country ? country.name : countryCode;

      const result = await signup(email, password, firstName, lastName, undefined, countryName, customerId);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || t('signupFailed'));
      }
    } catch (err) {
      console.error('Signup error:', err);
      const errorMessage = err.response?.data?.error?.message || 
                          err.message || 
                          (language === 'fr' ? 'Erreur lors de l\'inscription' : 'Signup failed');
      setError(errorMessage);
      setVerifyingCard(false);
    } finally {
      setLoading(false);
      setVerifyingCard(false);
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
            <input
              type="password"
              value={password}
              onChange={handlePasswordChange}
              autoComplete="new-password"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${passwordError ? errorText : borderColor}`,
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
                e.target.style.borderColor = passwordError ? errorText : primaryColor;
                e.target.style.boxShadow = passwordError ? 'none' : `0 0 0 3px ${primaryColor}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = passwordError ? errorText : borderColor;
                e.target.style.boxShadow = 'none';
              }}
              required
              disabled={loading}
            />
            {passwordError && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: errorText }}>
                {passwordError}
              </div>
            )}
            {!passwordError && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: textSecondary }}>
                {t('passwordRequirements')}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontWeight: '500' }}>
              {t('confirmPassword')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              autoComplete="new-password"
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${confirmPasswordError ? errorText : borderColor}`,
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
                e.target.style.borderColor = confirmPasswordError ? errorText : primaryColor;
                e.target.style.boxShadow = confirmPasswordError ? 'none' : `0 0 0 3px ${primaryColor}20`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = confirmPasswordError ? errorText : borderColor;
                e.target.style.boxShadow = 'none';
              }}
              required
              disabled={loading}
            />
            {confirmPasswordError && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: errorText }}>
                {confirmPasswordError}
              </div>
            )}
          </div>

          {/* Champ de carte bancaire (obligatoire - vérification sans prélèvement comme Render) */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: textColor, fontWeight: '500' }}>
              {language === 'fr' ? '💳 Carte bancaire (vérification uniquement - aucun prélèvement)' : '💳 Card (verification only - no charge)'}
            </label>
            <div style={{
              padding: '12px',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              backgroundColor: inputBg,
              transition: 'all 0.2s'
            }}>
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: textColor,
                      '::placeholder': {
                        color: textSecondary,
                      },
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    },
                    invalid: {
                      color: errorText,
                    },
                  },
                }}
              />
            </div>
            <div style={{ marginTop: '6px', fontSize: '12px', color: textSecondary }}>
              {language === 'fr' ? 'Aucun prélèvement ne sera effectué. Cette vérification permet de s\'assurer que vous êtes une personne réelle.' : 'No charge will be made. This verification ensures you are a real person.'}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || verifyingCard || !stripe || !elements}
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
            {verifyingCard 
              ? (language === 'fr' ? '⏳ Vérification de la carte...' : '⏳ Verifying card...')
              : loading 
                ? t('signupLoading') || (language === 'fr' ? '⏳ Inscription en cours...' : '⏳ Signing up...')
                : t('signupButton') || (language === 'fr' ? 'S\'inscrire' : 'Sign up')
            }
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

// Composant parent qui charge Stripe et wrap le formulaire
export default function Signup() {
  const [stripePublishableKey, setStripePublishableKey] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);
  const { language } = useLanguage();

  // Charger la clé Stripe publishable
  useEffect(() => {
    const loadStripeKey = async () => {
      try {
        const response = await fetch(`${API_URL}/api/auth/stripe-publishable-key`);
        if (response.ok) {
          const data = await response.json();
          const publishableKey = data.data.publishableKey;
          setStripePublishableKey(publishableKey);
          // Initialiser Stripe avec la clé
          const stripe = await loadStripe(publishableKey);
          setStripePromise(stripe);
        } else {
          console.error('Stripe not configured');
        }
      } catch (err) {
        console.error('Failed to load Stripe key:', err);
      }
    };
    loadStripeKey();
  }, []);

  // Si Stripe n'est pas encore chargé, afficher un message
  if (!stripePublishableKey || !stripePromise) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: '#fafbfc'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          {language === 'fr' ? 'Chargement...' : 'Loading...'}
        </div>
      </div>
    );
  }

  // Wrapper avec Stripe Elements
  return (
    <Elements stripe={stripePromise}>
      <SignupFormInner />
    </Elements>
  );
}



