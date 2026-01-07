/**
 * Routes MFA (Multi-Factor Authentication)
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const mfaService = require('../services/mfaService');
const logger = require('../utils/logger');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * GET /api/mfa/status
 * Obtenir le statut MFA de l'utilisateur
 */
router.get('/status', async (req, res, next) => {
  try {
    const UserModel = require('../models/userModel');
    const user = await UserModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found' },
      });
    }

    res.json({
      enabled: user.mfa_enabled || false,
      type: user.mfa_type || null,
      hasBackupCodes: (user.mfa_backup_codes || []).length > 0,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/mfa/setup
 * Générer un secret TOTP et QR code
 */
router.post('/setup', async (req, res, next) => {
  try {
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    const UserModel = require('../models/userModel');
    
    // Vérifier d'abord le statut MFA
    const userStatus = await UserModel.findById(req.user.id);
    if (userStatus && userStatus.mfa_enabled) {
      return res.status(400).json({
        error: { message: 'MFA is already enabled' },
      });
    }

    // Obtenir le document Mongoose pour pouvoir utiliser .save()
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found' },
      });
    }

    const { secret, qrCode, manualEntryKey } = await mfaService.generateTOTPSecret(
      req.user.id,
      user.email
    );

    // Stocker temporairement le secret (non vérifié)
    user.mfa_secret_temp = secret;
    await user.save();

    res.json({
      secret,
      qrCode,
      manualEntryKey,
      message: 'Scan the QR code with your authenticator app',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/mfa/verify
 * Vérifier le code TOTP et activer MFA
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: { message: 'Token is required' },
      });
    }

    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    
    // Obtenir le document Mongoose pour pouvoir utiliser .save()
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found' },
      });
    }

    if (!user.mfa_secret_temp) {
      return res.status(400).json({
        error: { message: 'MFA setup not initiated' },
      });
    }

    // Vérifier le token
    const isValid = mfaService.verifyTOTP(token, user.mfa_secret_temp);

    if (!isValid) {
      return res.status(400).json({
        error: { message: 'Invalid token' },
      });
    }

    // Activer MFA
    const { backupCodes } = await mfaService.enableMFA(
      req.user.id,
      user.mfa_secret_temp,
      null
    );

    // Nettoyer le secret temporaire
    user.mfa_secret_temp = null;
    await user.save();

    logger.logInfo('MFA enabled for user', { userId: req.user.id });

    res.json({
      success: true,
      backupCodes, // Retourner une seule fois
      message: 'MFA enabled successfully. Save your backup codes!',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/mfa/disable
 * Désactiver MFA (nécessite le mot de passe)
 */
router.post('/disable', async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: { message: 'Password is required' },
      });
    }

    await mfaService.disableMFA(req.user.id, password);

    logger.logInfo('MFA disabled for user', { userId: req.user.id });

    res.json({
      success: true,
      message: 'MFA disabled successfully',
    });
  } catch (err) {
    if (err.message === 'Invalid password') {
      return res.status(401).json({
        error: { message: 'Invalid password' },
      });
    }
    next(err);
  }
});

/**
 * POST /api/mfa/verify-login
 * Vérifier MFA lors de la connexion (route publique)
 */
router.post('/verify-login', async (req, res, next) => {
  try {
    const { userId, token } = req.body;

    if (!userId || !token) {
      return res.status(400).json({
        error: { message: 'UserId and token are required' },
      });
    }

    const result = await mfaService.verifyMFA(userId, token);

    if (!result.valid) {
      return res.status(401).json({
        error: { message: result.reason || 'Invalid token' },
      });
    }

    res.json({
      valid: true,
      backupCodeUsed: result.backupCodeUsed || false,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

