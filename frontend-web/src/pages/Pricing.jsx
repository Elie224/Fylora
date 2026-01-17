/**
 * Page Pricing - Modèle Optimisé
 * Plans: FREE, PLUS, PRO, TEAM
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuthStore } from '../services/authStore';
import { API_URL } from '../config';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Toast';

export default function Pricing() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = !!(user && accessToken);
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState('monthly'); // 'monthly' | 'yearly'

  useEffect(() => {
    loadPlans();
    if (isAuthenticated) {
      loadCurrentPlan();
    }
  }, [isAuthenticated]);

  const loadPlans = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/plans`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setPlans(data.data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      // En cas d'erreur, utiliser les plans par défaut
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPlan = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/plans/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setCurrentPlan(data.data);
    } catch (error) {
      console.error('Error loading current plan:', error);
    }
  };

  const handleUpgrade = async (planId, paymentMethod = 'stripe') => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      
      if (paymentMethod === 'stripe') {
        // Créer une session Stripe
        const response = await fetch(`${API_URL}/api/billing/stripe/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            planId,
            period: billingPeriod
          })
        });

        if (response.ok) {
          const data = await response.json();
          // Rediriger vers Stripe Checkout
          window.location.href = data.data.url;
        } else {
          const error = await response.json();
          showToast(error.error?.message || t('stripeCheckoutFailed') || 'Stripe checkout failed', 'error');
        }
      } else if (paymentMethod === 'paypal') {
        // Créer un paiement PayPal
        const response = await fetch(`${API_URL}/api/billing/paypal/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            planId,
            period: billingPeriod
          })
        });

        if (response.ok) {
          const data = await response.json();
          // Rediriger vers PayPal
          window.location.href = data.data.approvalUrl;
        } else {
          const error = await response.json();
          showToast(error.error?.message || t('paypalPaymentFailed') || 'PayPal payment failed', 'error');
        }
      } else {
        // Upgrade direct (pour tests ou plans gratuits)
        const response = await fetch(`${API_URL}/api/plans/upgrade`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            planId,
            period: billingPeriod
          })
        });

        if (response.ok) {
          const data = await response.json();
          showToast(t('planUpgraded') || 'Plan upgraded successfully!', 'success');
          loadCurrentPlan();
        } else {
          const error = await response.json();
          showToast(error.error?.message || t('upgradeFailed') || 'Upgrade failed', 'error');
        }
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      showToast(t('errorOccurred') || 'An error occurred', 'error');
    }
  };

  // Thème sombre uniquement
  const bgColor = '#121212';
  const cardBg = '#1e1e1e';
  const textColor = '#e0e0e0';
  const textSecondary = '#b0b0b0';
  const borderColor = '#333333';
  const primaryColor = '#2196F3';
  const successColor = '#4CAF50';

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: textColor }}>
        {t('loading') || 'Loading...'}
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog />
      <div style={{
        minHeight: '100vh',
        backgroundColor: bgColor,
        padding: '40px 20px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: textColor,
            marginBottom: '16px'
          }}>
            {t('pricing') || 'Pricing'}
          </h1>
          <p style={{
            fontSize: '20px',
            color: textSecondary,
            marginBottom: '32px'
          }}>
            {t('pricingDescription') || 'Choose the perfect plan for your needs'}
          </p>

          {/* Billing Period Toggle */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: '#2d2d2d',
            borderRadius: '8px',
            padding: '4px',
            gap: '4px'
          }}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              style={{
                padding: '8px 24px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: billingPeriod === 'monthly' ? primaryColor : 'transparent',
                color: billingPeriod === 'monthly' ? 'white' : textColor,
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              {t('monthly') || 'Monthly'}
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              style={{
                padding: '8px 24px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: billingPeriod === 'yearly' ? primaryColor : 'transparent',
                color: billingPeriod === 'yearly' ? 'white' : textColor,
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              {t('yearly') || 'Yearly'}
              {billingPeriod === 'yearly' && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '12px',
                  backgroundColor: successColor,
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  Save up to 17%
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          marginBottom: '60px'
        }}>
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan?.plan?.id === plan.id;
            const isFree = plan.id === 'free';
            const isPopular = plan.id === 'pro';
            const price = plan.price[billingPeriod];
            const yearlySavings = plan.yearlySavings || 0;

            return (
              <div
                key={plan.id}
                style={{
                  backgroundColor: cardBg,
                  borderRadius: '16px',
                  padding: '32px',
                  border: `2px solid ${isPopular ? primaryColor : borderColor}`,
                  position: 'relative',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  transform: isPopular ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = isPopular ? 'scale(1.05)' : 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
                }}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: primaryColor,
                    color: 'white',
                    padding: '4px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {t('mostPopular') || 'MOST POPULAR'}
                  </div>
                )}

                {/* Plan Name */}
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: textColor,
                  marginBottom: '8px'
                }}>
                  {plan.displayName}
                </h2>

                {/* Price */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{
                    fontSize: '48px',
                    fontWeight: 'bold',
                    color: textColor,
                    lineHeight: '1'
                  }}>
                    ${price}
                    {!isFree && (
                      <span style={{
                        fontSize: '20px',
                        color: textSecondary
                      }}>
                        /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    )}
                  </div>
                  {billingPeriod === 'yearly' && yearlySavings > 0 && (
                    <div style={{
                      fontSize: '14px',
                      color: successColor,
                      marginTop: '4px'
                    }}>
                      Save {yearlySavings}%
                    </div>
                  )}
                </div>

                {/* Storage */}
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: textColor,
                  marginBottom: '24px',
                  paddingBottom: '16px',
                  borderBottom: `1px solid ${borderColor}`
                }}>
                  {plan.storageFormatted} {t('storage') || 'storage'}
                </div>

                {/* Features */}
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  marginBottom: '32px'
                }}>
                  {Object.entries(plan.features).slice(0, 8).map(([key, value]) => {
                    if (typeof value === 'boolean' && value) {
                      return (
                        <li key={key} style={{
                          padding: '8px 0',
                          color: textSecondary,
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{ color: successColor }}>✓</span>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </li>
                      );
                    }
                    return null;
                  })}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={async () => {
                    if (isFree) {
                      if (!isAuthenticated) {
                        navigate('/signup');
                      }
                    } else {
                      // Pour les plans payants, demander la méthode de paiement
                      const useStripe = await confirm(
                        t('useStripeForPayment') || 'Use Stripe for payment? (Cancel for PayPal)',
                        t('paymentMethod')
                      );
                      handleUpgrade(plan.id, useStripe ? 'stripe' : 'paypal');
                    }
                  }}
                  disabled={isCurrentPlan}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isCurrentPlan
                      ? '#2d2d2d'
                      : isPopular
                      ? primaryColor
                      : '#2d2d2d',
                    color: isCurrentPlan
                      ? '#666'
                      : isPopular
                      ? 'white'
                      : textColor,
                    cursor: isCurrentPlan ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '16px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isCurrentPlan) {
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCurrentPlan) {
                      e.currentTarget.style.opacity = '1';
                    }
                  }}
                >
                  {isCurrentPlan
                    ? (t('currentPlan') || 'Current Plan')
                    : isFree
                    ? (t('getStarted') || 'Get Started')
                    : (t('upgrade') || 'Upgrade')}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '40px',
          backgroundColor: cardBg,
          borderRadius: '16px',
          marginBottom: '40px'
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: textColor,
            marginBottom: '32px',
            textAlign: 'center'
          }}>
            {t('faq') || 'Frequently Asked Questions'}
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                question: t('faqQuestion1') || 'Quels sont les moyens de paiement acceptés ?',
                answer: t('faqAnswer1') || 'Nous acceptons les paiements par carte bancaire via Stripe et PayPal. Tous les paiements sont sécurisés et cryptés.'
              },
              {
                question: t('faqQuestion2') || 'Puis-je changer de plan à tout moment ?',
                answer: t('faqAnswer2') || 'Oui, vous pouvez upgrader votre plan à tout moment. Le nouveau plan sera activé immédiatement après le paiement. Pour rétrograder, contactez notre support.'
              },
              {
                question: t('faqQuestion3') || 'Que se passe-t-il si je dépasse mon quota de stockage ?',
                answer: t('faqAnswer3') || 'Vous recevrez des notifications à 80%, 90% et 95% de votre quota. Une fois le quota atteint, vous ne pourrez plus uploader de nouveaux fichiers jusqu\'à ce que vous mettiez à niveau votre plan.'
              },
              {
                question: t('faqQuestion4') || 'Les fichiers sont-ils sécurisés ?',
                answer: t('faqAnswer4') || 'Oui, tous vos fichiers sont chiffrés et stockés de manière sécurisée. Nous utilisons les meilleures pratiques de sécurité pour protéger vos données.'
              },
              {
                question: t('faqQuestion5') || 'Puis-je annuler mon abonnement ?',
                answer: t('faqAnswer5') || 'Oui, vous pouvez annuler votre abonnement à tout moment depuis les paramètres de votre compte. Vous conserverez l\'accès jusqu\'à la fin de la période payée, puis votre compte sera rétrogradé vers le plan gratuit.'
              },
              {
                question: t('faqQuestion6') || 'Y a-t-il un essai gratuit pour les plans payants ?',
                answer: t('faqAnswer6') || 'Le plan FREE (20 Go) est déjà gratuit et sans engagement. Pour les plans payants, vous pouvez upgrader à tout moment et annuler sans frais si vous n\'êtes pas satisfait.'
              },
              {
                question: t('faqQuestion7') || 'Comment puis-je contacter le support ?',
                answer: t('faqAnswer7') || 'Vous pouvez nous contacter par email à kouroumaelisee@gmail.com ou par téléphone au +33689306432. Notre équipe est disponible pour vous aider.'
              }
            ].map((faq, index) => (
              <div
                key={index}
                style={{
                  padding: '20px',
                  backgroundColor: '#2d2d2d',
                  borderRadius: '12px',
                  border: `1px solid ${borderColor}`,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = primaryColor;
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = borderColor;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: textColor,
                  marginBottom: '12px'
                }}>
                  {faq.question}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: textSecondary,
                  lineHeight: '1.6',
                  margin: 0
                }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

