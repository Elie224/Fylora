/**
 * Routes Security Center
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const securityCenterController = require('../controllers/securityCenterController');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Obtenir l'historique des connexions
router.get('/login-history', securityCenterController.getLoginHistory);

// Obtenir les sessions actives
router.get('/sessions', securityCenterController.getActiveSessions);

// Révoker une session
router.delete('/sessions/:sessionId', securityCenterController.revokeSession);

// Révoker toutes les autres sessions
router.delete('/sessions', securityCenterController.revokeAllOtherSessions);

// Obtenir les statistiques de sécurité
router.get('/stats', securityCenterController.getSecurityStats);

module.exports = router;

