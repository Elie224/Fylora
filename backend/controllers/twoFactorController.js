/**
 * Contrôleur pour l'authentification à deux facteurs (2FA)
 */
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const TwoFactorAuth = require('../models/TwoFactorAuth');
const UserModel = require('../models/userModel');
const { successResponse, errorResponse } = require('../utils/response');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Générer un secret 2FA et un QR code
 */
exports.setup2FA = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Vérifier si 2FA est déjà configuré
    let twoFactor = await TwoFactorAuth.findOne({ user_id: userId });
    
    if (twoFactor && twoFactor.enabled) {
      return errorResponse(res, '2FA is already enabled', 400);
    }

    // Générer un nouveau secret
    const secret = speakeasy.generateSecret({
      name: `Fylora (${req.user.email})`,
      length: 32,
    });

    // Générer des codes de secours
    const backupCodes = Array.from({ length: 10 }, () => ({
      code: crypto.randomBytes(4).toString('hex').toUpperCase(),
      used: false,
    }));

    if (twoFactor) {
      // Mettre à jour le secret existant
      twoFactor.secret = secret.base32;
      twoFactor.backup_codes = backupCodes;
      twoFactor.enabled = false; // Pas encore activé jusqu'à vérification
      await twoFactor.save();
    } else {
      // Créer un nouveau 2FA
      twoFactor = await TwoFactorAuth.create({
        user_id: userId,
        secret: secret.base32,
        backup_codes: backupCodes,
        enabled: false,
      });
    }

    // Générer le QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    logger.logInfo('2FA setup initiated', { userId });

    return successResponse(res, {
      secret: secret.base32,
      qr_code: qrCodeUrl,
      backup_codes: backupCodes.map(bc => bc.code),
      message: 'Scan the QR code with your authenticator app and verify with a code',
    });
  } catch (error) {
    logger.logError(error, { context: 'setup2FA' });
    next(error);
  }
};

/**
 * Vérifier et activer le 2FA
 */
exports.verifyAndEnable2FA = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return errorResponse(res, 'Token is required', 400);
    }

    const twoFactor = await TwoFactorAuth.findOne({ user_id: userId });
    if (!twoFactor) {
      return errorResponse(res, '2FA not set up', 404);
    }

    // Vérifier le token
    const verified = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 2, // Accepter les tokens dans une fenêtre de ±2 périodes
    });

    if (!verified) {
      return errorResponse(res, 'Invalid token', 400);
    }

    // Activer le 2FA
    twoFactor.enabled = true;
    await twoFactor.save();

    logger.logInfo('2FA enabled', { userId });

    return successResponse(res, {
      message: '2FA enabled successfully',
      backup_codes: twoFactor.backup_codes.map(bc => bc.code),
    });
  } catch (error) {
    logger.logError(error, { context: 'verifyAndEnable2FA' });
    next(error);
  }
};

/**
 * Désactiver le 2FA
 */
exports.disable2FA = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password, token } = req.body;

    const twoFactor = await TwoFactorAuth.findOne({ user_id: userId });
    if (!twoFactor || !twoFactor.enabled) {
      return errorResponse(res, '2FA is not enabled', 400);
    }

    // Vérifier le mot de passe
    const user = await UserModel.findById(userId);
    if (!user || !user.password_hash) {
      return errorResponse(res, 'Password verification failed', 400);
    }

    const bcrypt = require('bcryptjs');
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return errorResponse(res, 'Invalid password', 400);
    }

    // Vérifier le token 2FA ou un code de secours
    let tokenValid = false;
    
    // Vérifier le token TOTP
    const totpValid = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (totpValid) {
      tokenValid = true;
    } else {
      // Vérifier les codes de secours
      const backupCode = twoFactor.backup_codes.find(
        bc => bc.code === token.toUpperCase() && !bc.used
      );
      if (backupCode) {
        backupCode.used = true;
        backupCode.used_at = new Date();
        await twoFactor.save();
        tokenValid = true;
      }
    }

    if (!tokenValid) {
      return errorResponse(res, 'Invalid 2FA token', 400);
    }

    // Désactiver le 2FA
    twoFactor.enabled = false;
    await twoFactor.save();

    logger.logInfo('2FA disabled', { userId });

    return successResponse(res, { message: '2FA disabled successfully' });
  } catch (error) {
    logger.logError(error, { context: 'disable2FA' });
    next(error);
  }
};

/**
 * Vérifier un token 2FA lors de la connexion
 */
exports.verify2FAToken = async (userId, token) => {
  try {
    const twoFactor = await TwoFactorAuth.findOne({ user_id: userId, enabled: true });
    if (!twoFactor) {
      return { valid: false, reason: '2FA not enabled' };
    }

    // Vérifier le token TOTP
    const totpValid = speakeasy.totp.verify({
      secret: twoFactor.secret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (totpValid) {
      twoFactor.last_used_at = new Date();
      await twoFactor.save();
      return { valid: true };
    }

    // Vérifier les codes de secours
    const backupCode = twoFactor.backup_codes.find(
      bc => bc.code === token.toUpperCase() && !bc.used
    );

    if (backupCode) {
      backupCode.used = true;
      backupCode.used_at = new Date();
      await twoFactor.save();
      return { valid: true, usedBackupCode: true };
    }

    return { valid: false, reason: 'Invalid token' };
  } catch (error) {
    logger.logError(error, { context: 'verify2FAToken' });
    return { valid: false, reason: 'Error verifying token' };
  }
};

/**
 * Obtenir le statut 2FA de l'utilisateur
 */
exports.get2FAStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const twoFactor = await TwoFactorAuth.findOne({ user_id: userId });

    return successResponse(res, {
      enabled: twoFactor?.enabled || false,
      has_backup_codes: twoFactor?.backup_codes?.some(bc => !bc.used) || false,
    });
  } catch (error) {
    logger.logError(error, { context: 'get2FAStatus' });
    next(error);
  }
};

/**
 * Régénérer les codes de secours
 */
exports.regenerateBackupCodes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const twoFactor = await TwoFactorAuth.findOne({ user_id: userId, enabled: true });

    if (!twoFactor) {
      return errorResponse(res, '2FA is not enabled', 400);
    }

    // Générer de nouveaux codes de secours
    const backupCodes = Array.from({ length: 10 }, () => ({
      code: crypto.randomBytes(4).toString('hex').toUpperCase(),
      used: false,
    }));

    twoFactor.backup_codes = backupCodes;
    await twoFactor.save();

    logger.logInfo('Backup codes regenerated', { userId });

    return successResponse(res, {
      backup_codes: backupCodes.map(bc => bc.code),
      message: 'New backup codes generated',
    });
  } catch (error) {
    logger.logError(error, { context: 'regenerateBackupCodes' });
    next(error);
  }
};


