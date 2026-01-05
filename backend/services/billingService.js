/**
 * Service de Billing (Stripe & PayPal)
 * Gestion des abonnements et paiements
 */

const logger = require('../utils/logger');
const planService = require('./planService');

// Stripe
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    logger.logInfo('Stripe initialized');
  } catch (error) {
    logger.logError(error, { context: 'stripe_init' });
  }
}

/**
 * Créer une session de checkout Stripe
 * @param {string} userId - ID utilisateur
 * @param {string} planId - ID du plan
 * @param {string} period - 'monthly' ou 'yearly'
 * @returns {Promise<Object>} { sessionId, url }
 */
async function createStripeCheckoutSession(userId, planId, period = 'monthly') {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const plan = planService.getPlan(planId);
  if (!plan) {
    throw new Error('Invalid plan');
  }

  const price = plan.price[period];
  const priceId = process.env[`STRIPE_PRICE_${planId.toUpperCase()}_${period.toUpperCase()}`];

  if (!priceId) {
    throw new Error(`Stripe price ID not configured for ${planId} ${period}`);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/pricing?canceled=true`,
      client_reference_id: userId,
      metadata: {
        userId,
        planId,
        period,
      },
    });

    logger.logInfo('Stripe checkout session created', {
      userId,
      planId,
      period,
      sessionId: session.id
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (error) {
    logger.logError(error, { context: 'create_stripe_checkout', userId, planId });
    throw error;
  }
}

/**
 * Créer un abonnement PayPal
 * @param {string} userId - ID utilisateur
 * @param {string} planId - ID du plan
 * @param {string} period - 'monthly' ou 'yearly'
 * @returns {Promise<Object>} { approvalUrl, subscriptionId }
 */
async function createPayPalPayment(userId, planId, period = 'monthly') {
  const paypal = require('@paypal/checkout-server-sdk');
  
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal not configured');
  }

  const plan = planService.getPlan(planId);
  if (!plan) {
    throw new Error('Invalid plan');
  }

  const price = plan.price[period];
  const currency = plan.price.currency || 'USD';

  // Environnement PayPal (les paiements vont automatiquement sur le compte associé au Client ID/Secret)
  const environment = process.env.PAYPAL_ENVIRONMENT === 'production'
    ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
    : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);

  const client = new paypal.core.PayPalHttpClient(environment);

  // Créer un plan de facturation PayPal
  const billingPlanRequest = new paypal.billing.BillingPlansCreateRequest();
  billingPlanRequest.prefer('return=representation');
  billingPlanRequest.requestBody({
    product_id: `PROD-${planId.toUpperCase()}-${period.toUpperCase()}`,
    name: `${plan.displayName} - ${period === 'monthly' ? 'Mensuel' : 'Annuel'}`,
    description: `Plan ${plan.displayName} pour Fylora`,
    status: 'ACTIVE',
    billing_cycles: [{
      frequency: {
        interval_unit: period === 'monthly' ? 'MONTH' : 'YEAR',
        interval_count: 1
      },
      tenure_type: 'REGULAR',
      sequence: 1,
      total_cycles: 0, // 0 = illimité
      pricing_scheme: {
        fixed_price: {
          value: price.toString(),
          currency_code: currency
        }
      }
    }],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: {
        value: '0',
        currency_code: currency
      },
      setup_fee_failure_action: 'CONTINUE',
      payment_failure_threshold: 3
    },
    taxes: {
      percentage: '0',
      inclusive: false
    }
  });

  let billingPlan;
  try {
    const planResponse = await client.execute(billingPlanRequest);
    billingPlan = planResponse.result;
    
    // Activer le plan
    const activateRequest = new paypal.billing.BillingPlansActivateRequest(planResponse.result.id);
    await client.execute(activateRequest);
  } catch (error) {
    // Si le plan existe déjà, le récupérer
    logger.logWarn('Billing plan creation failed, trying to use existing', { error: error.message });
    // Pour simplifier, on utilise une approche avec Orders pour les paiements récurrents
  }

  // Créer une subscription avec Orders (approche simplifiée qui fonctionne)
  const orderRequest = new paypal.orders.OrdersCreateRequest();
  orderRequest.prefer('return=representation');
  orderRequest.requestBody({
    intent: 'CAPTURE',
    purchase_units: [{
      amount: {
        currency_code: currency,
        value: price.toString(),
      },
      description: `${plan.displayName} Plan - ${period}`,
      custom_id: `${userId}_${planId}_${period}`, // Stocker userId, planId, period pour le webhook
    }],
    application_context: {
      brand_name: 'Fylora',
      landing_page: 'BILLING',
      user_action: 'PAY_NOW',
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/pricing?success=true&paymentId={ORDER_ID}&userId=${userId}&planId=${planId}&period=${period}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/pricing?canceled=true`,
    },
  });

  try {
    const order = await client.execute(orderRequest);
    
    logger.logInfo('PayPal payment created', {
      userId,
      planId,
      period,
      orderId: order.result.id
    });

    // Trouver le lien d'approbation
    const approvalUrl = order.result.links?.find(link => link.rel === 'approve')?.href;

    return {
      approvalUrl,
      paymentId: order.result.id,
      orderId: order.result.id,
    };
  } catch (error) {
    logger.logError(error, { context: 'create_paypal_payment', userId, planId });
    throw error;
  }
}

/**
 * Vérifier le statut d'un paiement Stripe
 * @param {string} sessionId - ID de la session Stripe
 * @returns {Promise<Object>} { status, userId, planId, period }
 */
async function verifyStripePayment(sessionId) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
      return {
        status: 'success',
        userId: session.client_reference_id,
        planId: session.metadata?.planId,
        period: session.metadata?.period,
        subscriptionId: session.subscription,
      };
    }

    return {
      status: 'pending',
      userId: session.client_reference_id,
    };
  } catch (error) {
    logger.logError(error, { context: 'verify_stripe_payment', sessionId });
    throw error;
  }
}

/**
 * Gérer un webhook Stripe
 * @param {Object} event - Événement Stripe
 * @returns {Promise<void>}
 */
async function handleStripeWebhook(event) {
  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const mongoose = require('mongoose');
  const User = mongoose.models.User || mongoose.model('User');

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const userId = session.client_reference_id;
        const planId = session.metadata?.planId;
        
        if (userId && planId) {
          await User.findByIdAndUpdate(userId, {
            plan: planId,
            quota_limit: planService.getStorageQuota(planId),
          });
          
          logger.logInfo('User plan updated from Stripe webhook (checkout completed)', {
            userId,
            planId,
            sessionId: session.id
          });
        }
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object;
        // Récupérer le plan depuis les metadata de la subscription ou depuis le price
        const subscriptionPlanId = subscription.metadata?.planId;
        
        if (subscriptionPlanId && subscription.status === 'active') {
          // Récupérer le customer pour trouver l'utilisateur
          const customer = await stripe.customers.retrieve(subscription.customer);
          const customerUserId = customer.metadata?.userId || customer.id;
          
          // Chercher l'utilisateur par email ou metadata
          let user = null;
          if (customer.email) {
            user = await User.findOne({ email: customer.email });
          }
          if (!user && customerUserId) {
            user = await User.findById(customerUserId);
          }
          
          if (user) {
            await User.findByIdAndUpdate(user._id, {
              plan: subscriptionPlanId,
              quota_limit: planService.getStorageQuota(subscriptionPlanId),
            });
            
            logger.logInfo('User plan updated from Stripe webhook (subscription updated)', {
              userId: user._id,
              planId: subscriptionPlanId,
              subscriptionId: subscription.id
            });
          }
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        // Récupérer le customer pour trouver l'utilisateur
        const deletedCustomer = await stripe.customers.retrieve(deletedSubscription.customer);
        let deletedUser = null;
        if (deletedCustomer.email) {
          deletedUser = await User.findOne({ email: deletedCustomer.email });
        }
        
        if (deletedUser) {
          // Rétrograder vers le plan FREE
          await User.findByIdAndUpdate(deletedUser._id, {
            plan: 'free',
            quota_limit: planService.getStorageQuota('free'),
          });
          
          logger.logInfo('User plan downgraded to FREE (subscription canceled)', {
            userId: deletedUser._id,
            subscriptionId: deletedSubscription.id
          });
        }
        break;

      default:
        logger.logInfo('Unhandled Stripe webhook event', {
          type: event.type
        });
    }
  } catch (error) {
    logger.logError(error, { context: 'handle_stripe_webhook', eventType: event.type });
    throw error;
  }
}

module.exports = {
  createStripeCheckoutSession,
  createPayPalPayment,
  verifyStripePayment,
  handleStripeWebhook,
  isStripeConfigured: () => !!stripe,
  isPayPalConfigured: () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
};

