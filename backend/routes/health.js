/**
 * Routes de health check pour monitoring et surveillance
 */

const express = require('express');
const router = express.Router();
const { healthCheck, readinessCheck, livenessCheck } = require('../middlewares/healthCheck');

// Health check complet (avec vérifications détaillées)
router.get('/', healthCheck);

// Readiness check (prêt à recevoir du trafic)
router.get('/ready', readinessCheck);

// Liveness check (application vivante)
router.get('/live', livenessCheck);

module.exports = router;
