/**
 * Service MFA (Multi-Factor Authentication)
 * Support: Email, TOTP (Google Authenticator), SMS
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');
const UserModel = require('../models/userModel');

class MFAService {
  /**
   * Générer un secret TOTP pour un utilisateur
   */
  async generateTOTPSecret(userId, email) {
    const secret = speakeasy.generateSecret({
      name: `Fylora (${email})`,
      issuer: 'Fylora',
      length: 32,
    });

    // Stocker le secret temporairement (doit être confirmé)
    const tempSecret = {
      secret: secret.base32,
      userId,
      createdAt: new Date(),
      verified: false,
    };

    // Générer un QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
    };
  }

  /**
   * Vérifier un code TOTP
   */
  verifyTOTP(token, secret) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Accepter ±2 périodes (60 secondes)
    });
  }

  /**
   * Activer MFA pour un utilisateur
   */
  async enableMFA(userId, secret, backupCodes) {
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    
    // Obtenir le document Mongoose pour pouvoir utiliser .save()
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Générer des codes de backup
    const codes = backupCodes || this.generateBackupCodes();

    user.mfa_enabled = true;
    user.mfa_secret = secret;
    user.mfa_backup_codes = codes.map(code => this.hashBackupCode(code));
    user.mfa_type = 'totp';
    await user.save();

    logger.logInfo('MFA enabled for user', { userId });

    return {
      backupCodes: codes, // Retourner les codes en clair une seule fois
      message: 'MFA enabled successfully. Save your backup codes!',
    };
  }

  /**
   * Désactiver MFA
   */
  async disableMFA(userId, password) {
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    
    // Obtenir le document Mongoose pour pouvoir utiliser .save()
    const user = await User.findById(userId);
    if (!user || !user.password_hash) {
      throw new Error('User not found or has no password set');
    }

    const bcrypt = require('bcryptjs');
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid password');
    }

    user.mfa_enabled = false;
    user.mfa_secret = null;
    user.mfa_backup_codes = [];
    user.mfa_type = null;
    await user.save();

    logger.logInfo('MFA disabled for user', { userId });
  }

  /**
   * Vérifier MFA lors de la connexion
   */
  async verifyMFA(userId, token) {
    const mongoose = require('mongoose');
    const User = mongoose.models.User;
    
    // Obtenir le document Mongoose pour pouvoir utiliser .save() si nécessaire
    const user = await User.findById(userId);
    if (!user || !user.mfa_enabled) {
      return { valid: false, reason: 'MFA not enabled' };
    }

    // Vérifier le code TOTP
    if (user.mfa_type === 'totp') {
      const isValid = this.verifyTOTP(token, user.mfa_secret);
      if (isValid) {
        return { valid: true };
      }
    }

    // Vérifier les codes de backup
    if (user.mfa_backup_codes && user.mfa_backup_codes.length > 0) {
      const hashedToken = this.hashBackupCode(token);
      const codeIndex = user.mfa_backup_codes.findIndex(
        code => code === hashedToken
      );

      if (codeIndex !== -1) {
        // Supprimer le code utilisé
        user.mfa_backup_codes.splice(codeIndex, 1);
        await user.save();

        logger.logWarn('Backup code used for MFA', { userId });
        return { valid: true, backupCodeUsed: true };
      }
    }

    return { valid: false, reason: 'Invalid token' };
  }

  /**
   * Générer des codes de backup
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Générer un code de 8 caractères alphanumériques
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Hasher un code de backup pour stockage
   */
  hashBackupCode(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Envoyer un code MFA par email
   */
  async sendEmailCode(userId, email) {
    // Générer un code à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Stocker le code (dans Redis ou DB)
    const redisCache = require('../utils/redisCache');
    await redisCache.set(
      `mfa:email:${userId}`,
      { code, expiresAt: expiresAt.toISOString() },
      600 // 10 minutes TTL
    );

    // Envoyer l'email (intégrer avec votre service d'email)
    // TODO: Intégrer avec service d'email (SendGrid, AWS SES, etc.)
    logger.logInfo('MFA email code generated', { userId, email });

    return { sent: true, expiresIn: 600 };
  }

  /**
   * Vérifier un code email
   */
  async verifyEmailCode(userId, code) {
    const redisCache = require('../utils/redisCache');
    const stored = await redisCache.get(`mfa:email:${userId}`);

    if (!stored) {
      return { valid: false, reason: 'Code not found or expired' };
    }

    if (stored.code !== code) {
      return { valid: false, reason: 'Invalid code' };
    }

    if (new Date(stored.expiresAt) < new Date()) {
      return { valid: false, reason: 'Code expired' };
    }

    // Supprimer le code après utilisation
    await redisCache.del(`mfa:email:${userId}`);

    return { valid: true };
  }
}

module.exports = new MFAService();

