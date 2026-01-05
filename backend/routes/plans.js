/**
 * Routes pour la Gestion des Plans
 * GET /api/plans - Liste des plans
 * GET /api/plans/current - Plan actuel de l'utilisateur
 * POST /api/plans/upgrade - Upgrade de plan
 */

const express = require('express');
const router = express.Router();
const planService = require('../services/planService');
const { authMiddleware } = require('../middlewares/authMiddleware');
const mongoose = require('mongoose');
const User = mongoose.models.User || mongoose.model('User');

/**
 * Obtenir tous les plans disponibles
 * GET /api/plans
 * Route publique - accessible sans authentification
 */
router.get('/', (req, res) => {
  const plans = planService.getAllPlans().map(plan => ({
    id: plan.id,
    name: plan.name,
    displayName: plan.displayName,
    storage: plan.storage,
    storageFormatted: planService.formatBytes(plan.storage),
    price: plan.price,
    features: plan.features,
    yearlySavings: planService.getYearlySavings(plan.id),
  }));

  res.status(200).json({
    data: plans
  });
});

/**
 * Obtenir le plan actuel de l'utilisateur
 * GET /api/plans/current
 * Nécessite une authentification
 */
router.get('/current', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('plan quota_limit quota_used').lean();
    
    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found' }
      });
    }

    const planId = user.plan || 'free';
    const plan = planService.getPlan(planId);
    
    // Calculer l'utilisation
    const used = user.quota_used || 0;
    const limit = user.quota_limit || plan.storage;
    const percentage = limit > 0 ? (used / limit) * 100 : 0;

    res.status(200).json({
      data: {
        plan: {
          id: plan.id,
          name: plan.name,
          displayName: plan.displayName,
          storage: plan.storage,
          storageFormatted: planService.formatBytes(plan.storage),
          price: plan.price,
          features: plan.features,
        },
        usage: {
          used,
          limit,
          available: Math.max(0, limit - used),
          percentage: Math.round(percentage * 100) / 100,
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Upgrader le plan d'un utilisateur
 * POST /api/plans/upgrade
 * Body: { planId, period: 'monthly'|'yearly' }
 * Nécessite une authentification
 */
router.post('/upgrade', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { planId, period = 'monthly' } = req.body;

    if (!planId) {
      return res.status(400).json({
        error: { message: 'planId is required' }
      });
    }

    const plan = planService.getPlan(planId);
    if (!plan) {
      return res.status(400).json({
        error: { message: 'Invalid plan ID' }
      });
    }

    // Vérifier que c'est un upgrade (pas un downgrade pour l'instant)
    const user = await User.findById(userId);
    const currentPlanId = user.plan || 'free';
    const currentPlan = planService.getPlan(currentPlanId);
    
    // TODO: Implémenter la logique de billing (Stripe/PayPal)
    // Pour l'instant, on met juste à jour le plan
    
    // Mettre à jour le plan et le quota
    user.plan = planId;
    user.quota_limit = plan.storage;
    await user.save();

    logger.logInfo('Plan upgraded', {
      userId,
      from: currentPlanId,
      to: planId,
      period
    });

    res.status(200).json({
      data: {
        message: 'Plan upgraded successfully',
        plan: {
          id: plan.id,
          name: plan.name,
          displayName: plan.displayName,
          storage: plan.storage,
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

