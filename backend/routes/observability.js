/**
 * Routes Observabilité
 * Endpoints pour les métriques et traces
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const observabilityService = require('../services/observabilityService');
const { circuitBreakers } = require('../utils/circuitBreaker');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Obtenir les métriques
router.get('/metrics', (req, res, next) => {
  try {
    const metrics = observabilityService.getMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    next(err);
  }
});

// Obtenir les traces récentes
router.get('/traces', (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const traces = observabilityService.getTraces(limit);
    res.json({
      success: true,
      data: traces,
    });
  } catch (err) {
    next(err);
  }
});

// Obtenir l'état des circuit breakers
router.get('/circuit-breakers', (req, res, next) => {
  try {
    const states = {};
    for (const [name, breaker] of Object.entries(circuitBreakers)) {
      states[name] = breaker.getState();
    }
    res.json({
      success: true,
      data: states,
    });
  } catch (err) {
    next(err);
  }
});

// Réinitialiser les métriques
router.post('/reset', (req, res, next) => {
  try {
    observabilityService.reset();
    res.json({
      success: true,
      message: 'Metrics reset successfully',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

