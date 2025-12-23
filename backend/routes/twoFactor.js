const express = require('express');
const router = express.Router();
const twoFactorController = require('../controllers/twoFactorController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Setup 2FA
router.post('/setup', twoFactorController.setup2FA);

// Vérifier et activer 2FA
router.post('/verify', twoFactorController.verifyAndEnable2FA);

// Désactiver 2FA
router.post('/disable', twoFactorController.disable2FA);

// Obtenir le statut 2FA
router.get('/status', twoFactorController.get2FAStatus);

// Régénérer les codes de secours
router.post('/regenerate-backup-codes', twoFactorController.regenerateBackupCodes);

module.exports = router;


