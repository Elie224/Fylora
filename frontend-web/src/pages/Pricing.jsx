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

export default function Pricing() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuthStore();
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
      const data = await response.json();
      setPlans(data.data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
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
          alert(error.error?.message || 'Stripe checkout failed');
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
          alert(error.error?.message || 'PayPal payment failed');
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
          alert(t('planUpgraded') || 'Plan upgraded successfully!');
          loadCurrentPlan();
        } else {
          const error = await response.json();
          alert(error.error?.message || 'Upgrade failed');
        }
      }
    } catch (error) {
      console.error('Error upgrading plan:', error);
      alert('An error occurred');
    }
  };

  const bgColor = theme === 'dark' ? '#121212' : '#fafbfc';
  const cardBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
  const textColor = theme === 'dark' ? '#e0e0e0' : '#1a202c';
  const borderColor = theme === 'dark' ? '#333333' : '#e2e8f0';
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
            color: theme === 'dark' ? '#b0b0b0' : '#4a5568',
            marginBottom: '32px'
          }}>
            {t('pricingDescription') || 'Choose the perfect plan for your needs'}
          </p>

          {/* Billing Period Toggle */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: theme === 'dark' ? '#2d2d2d' : '#f0f4f8',
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
                  boxShadow: theme === 'dark' 
                    ? '0 4px 6px rgba(0, 0, 0, 0.3)' 
                    : '0 2px 8px rgba(0, 0, 0, 0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  transform: isPopular ? 'scale(1.05)' : 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                  e.currentTarget.style.boxShadow = theme === 'dark'
                    ? '0 8px 16px rgba(0, 0, 0, 0.4)'
                    : '0 4px 16px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = isPopular ? 'scale(1.05)' : 'scale(1)';
                  e.currentTarget.style.boxShadow = theme === 'dark'
                    ? '0 4px 6px rgba(0, 0, 0, 0.3)'
                    : '0 2px 8px rgba(0, 0, 0, 0.1)';
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
                        color: theme === 'dark' ? '#b0b0b0' : '#4a5568'
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
                          color: theme === 'dark' ? '#b0b0b0' : '#4a5568',
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
                  onClick={() => {
                    if (isFree) {
                      if (!isAuthenticated) {
                        navigate('/signup');
                      }
                    } else {
                      // Pour les plans payants, demander la méthode de paiement
                      const useStripe = window.confirm('Use Stripe for payment? (Cancel for PayPal)');
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
                      ? (theme === 'dark' ? '#2d2d2d' : '#e0e0e0')
                      : isPopular
                      ? primaryColor
                      : theme === 'dark'
                      ? '#2d2d2d'
                      : '#f0f4f8',
                    color: isCurrentPlan
                      ? (theme === 'dark' ? '#666' : '#999')
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
          borderRadius: '16px'
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
          {/* FAQ items can be added here */}
        </div>
      </div>
    </div>
  );
}

