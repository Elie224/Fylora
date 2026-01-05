/**
 * Routes de Billing (Stripe & PayPal)
 */

const express = require('express');
const router = express.Router();
const billingService = require('../services/billingService');
const { authMiddleware } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * Créer une session de checkout Stripe
 * POST /api/billing/stripe/checkout
 * Body: { planId, period }
 */
router.post('/stripe/checkout', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { planId, period = 'monthly' } = req.body;

    if (!planId) {
      return res.status(400).json({
        error: { message: 'planId is required' }
      });
    }

    if (!billingService.isStripeConfigured()) {
      return res.status(503).json({
        error: { message: 'Stripe is not configured' }
      });
    }

    const checkout = await billingService.createStripeCheckoutSession(
      userId,
      planId,
      period
    );

    res.status(200).json({
      data: checkout
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Créer un paiement PayPal
 * POST /api/billing/paypal/create
 * Body: { planId, period }
 */
router.post('/paypal/create', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { planId, period = 'monthly' } = req.body;

    if (!planId) {
      return res.status(400).json({
        error: { message: 'planId is required' }
      });
    }

    if (!billingService.isPayPalConfigured()) {
      return res.status(503).json({
        error: { message: 'PayPal is not configured' }
      });
    }

    const payment = await billingService.createPayPalPayment(
      userId,
      planId,
      period
    );

    res.status(200).json({
      data: payment
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Vérifier le statut d'un paiement Stripe
 * GET /api/billing/stripe/verify/:sessionId
 */
router.get('/stripe/verify/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    if (!billingService.isStripeConfigured()) {
      return res.status(503).json({
        error: { message: 'Stripe is not configured' }
      });
    }

    const status = await billingService.verifyStripePayment(sessionId);

    res.status(200).json({
      data: status
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Vérifier le statut d'un paiement PayPal
 * GET /api/billing/paypal/verify/:orderId
 */
router.get('/paypal/verify/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;

    if (!billingService.isPayPalConfigured()) {
      return res.status(503).json({
        error: { message: 'PayPal is not configured' }
      });
    }

    const status = await billingService.verifyPayPalPayment(orderId);

    res.status(200).json({
      data: status
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Webhook Stripe (pas d'authentification requise)
 * POST /api/billing/stripe/webhook
 */
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    if (!billingService.isStripeConfigured()) {
      return res.status(503).json({
        error: { message: 'Stripe is not configured' }
      });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.logWarn('Stripe webhook secret not configured');
      return res.status(400).json({
        error: { message: 'Webhook secret not configured' }
      });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      logger.logError(err, { context: 'stripe_webhook_verification' });
      return res.status(400).json({
        error: { message: `Webhook Error: ${err.message}` }
      });
    }

    await billingService.handleStripeWebhook(event);

    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});

/**
 * Webhook PayPal (pas d'authentification requise)
 * POST /api/billing/paypal/webhook
 */
router.post('/paypal/webhook', express.json(), async (req, res, next) => {
  try {
    if (!billingService.isPayPalConfigured()) {
      return res.status(503).json({
        error: { message: 'PayPal is not configured' }
      });
    }

    // PayPal envoie les webhooks en JSON
    const event = req.body;

    await billingService.handlePayPalWebhook(event);

    res.status(200).json({ received: true });
  } catch (err) {
    logger.logError(err, { context: 'paypal_webhook' });
    next(err);
  }
});

module.exports = router;

