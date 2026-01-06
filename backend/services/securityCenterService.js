/**
 * Security Center Service
 * Historique connexions, IP suspectes, révocation de sessions
 */

const logger = require('../utils/logger');
const UserModel = require('../models/userModel');
const mongoose = require('mongoose');

// Schéma pour les sessions actives
const SessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  ip_address: { type: String, required: true },
  user_agent: { type: String },
  location: { type: String },
  created_at: { type: Date, default: Date.now },
  last_activity: { type: Date, default: Date.now },
  is_revoked: { type: Boolean, default: false },
  revoked_at: Date,
}, { timestamps: true });

const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);

// Schéma pour l'historique des connexions
const LoginHistorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ip_address: { type: String, required: true },
  user_agent: { type: String },
  location: { type: String },
  success: { type: Boolean, default: true },
  failure_reason: { type: String },
  created_at: { type: Date, default: Date.now },
}, { timestamps: false });

const LoginHistory = mongoose.models.LoginHistory || mongoose.model('LoginHistory', LoginHistorySchema);

class SecurityCenterService {
  /**
   * Enregistrer une nouvelle session
   */
  async recordSession(userId, token, ipAddress, userAgent, location = null) {
    try {
      const session = new Session({
        user_id: userId,
        token,
        ip_address: ipAddress,
        user_agent: userAgent,
        location,
      });
      await session.save();

      // Enregistrer dans l'historique
      await this.recordLogin(userId, ipAddress, userAgent, location, true);

      return session;
    } catch (err) {
      logger.logError(err, {
        context: 'record_session',
        userId,
      });
      throw err;
    }
  }

  /**
   * Enregistrer une tentative de connexion
   */
  async recordLogin(userId, ipAddress, userAgent, location = null, success = true, failureReason = null) {
    try {
      const loginHistory = new LoginHistory({
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        location,
        success,
        failure_reason: failureReason,
      });
      await loginHistory.save();

      // Détecter les IP suspectes
      if (!success) {
        await this.detectSuspiciousActivity(userId, ipAddress);
      }

      return loginHistory;
    } catch (err) {
      logger.logError(err, {
        context: 'record_login',
        userId,
      });
      throw err;
    }
  }

  /**
   * Détecter les activités suspectes
   */
  async detectSuspiciousActivity(userId, ipAddress) {
    try {
      // Compter les échecs récents (dernières 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentFailures = await LoginHistory.countDocuments({
        user_id: userId,
        ip_address: ipAddress,
        success: false,
        created_at: { $gte: oneDayAgo },
      });

      // Si plus de 5 échecs, marquer comme suspect
      if (recentFailures >= 5) {
        logger.logWarn('Suspicious activity detected', {
          userId,
          ipAddress,
          failureCount: recentFailures,
        });

        // Notifier l'utilisateur (à implémenter)
        // await notificationService.sendSecurityAlert(userId, ipAddress);
      }

      return recentFailures;
    } catch (err) {
      logger.logError(err, {
        context: 'detect_suspicious_activity',
        userId,
      });
      throw err;
    }
  }

  /**
   * Obtenir l'historique des connexions
   */
  async getLoginHistory(userId, limit = 50) {
    try {
      const history = await LoginHistory.find({ user_id: userId })
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      return history;
    } catch (err) {
      logger.logError(err, {
        context: 'get_login_history',
        userId,
      });
      throw err;
    }
  }

  /**
   * Obtenir les sessions actives
   */
  async getActiveSessions(userId) {
    try {
      const sessions = await Session.find({
        user_id: userId,
        is_revoked: false,
      })
        .sort({ last_activity: -1 })
        .lean();

      return sessions;
    } catch (err) {
      logger.logError(err, {
        context: 'get_active_sessions',
        userId,
      });
      throw err;
    }
  }

  /**
   * Révoker une session
   */
  async revokeSession(sessionId, userId) {
    try {
      const session = await Session.findOne({
        _id: sessionId,
        user_id: userId,
      });

      if (!session) {
        throw new Error('Session not found');
      }

      session.is_revoked = true;
      session.revoked_at = new Date();
      await session.save();

      logger.logInfo('Session revoked', {
        sessionId,
        userId,
      });

      return session;
    } catch (err) {
      logger.logError(err, {
        context: 'revoke_session',
        sessionId,
        userId,
      });
      throw err;
    }
  }

  /**
   * Révoker toutes les sessions sauf la session actuelle
   */
  async revokeAllOtherSessions(userId, currentToken) {
    try {
      const result = await Session.updateMany(
        {
          user_id: userId,
          token: { $ne: currentToken },
          is_revoked: false,
        },
        {
          is_revoked: true,
          revoked_at: new Date(),
        }
      );

      logger.logInfo('All other sessions revoked', {
        userId,
        revokedCount: result.modifiedCount,
      });

      return result.modifiedCount;
    } catch (err) {
      logger.logError(err, {
        context: 'revoke_all_other_sessions',
        userId,
      });
      throw err;
    }
  }

  /**
   * Mettre à jour l'activité d'une session
   */
  async updateSessionActivity(token) {
    try {
      await Session.updateOne(
        { token, is_revoked: false },
        { last_activity: new Date() }
      );
    } catch (err) {
      logger.logError(err, {
        context: 'update_session_activity',
      });
    }
  }

  /**
   * Vérifier si une session est révoquée
   */
  async isSessionRevoked(token) {
    try {
      const session = await Session.findOne({ token });
      return session ? session.is_revoked : true;
    } catch (err) {
      logger.logError(err, {
        context: 'is_session_revoked',
      });
      return true; // En cas d'erreur, considérer comme révoquée
    }
  }

  /**
   * Obtenir les statistiques de sécurité
   */
  async getSecurityStats(userId) {
    try {
      const [totalLogins, successfulLogins, failedLogins, activeSessions, uniqueIPs] = await Promise.all([
        LoginHistory.countDocuments({ user_id: userId }),
        LoginHistory.countDocuments({ user_id: userId, success: true }),
        LoginHistory.countDocuments({ user_id: userId, success: false }),
        Session.countDocuments({ user_id: userId, is_revoked: false }),
        LoginHistory.distinct('ip_address', { user_id: userId }),
      ]);

      // Dernière connexion
      const lastLogin = await LoginHistory.findOne({ user_id: userId })
        .sort({ created_at: -1 })
        .lean();

      return {
        totalLogins,
        successfulLogins,
        failedLogins,
        activeSessions,
        uniqueIPs: uniqueIPs.length,
        lastLogin: lastLogin ? {
          date: lastLogin.created_at,
          ip: lastLogin.ip_address,
          location: lastLogin.location,
          success: lastLogin.success,
        } : null,
      };
    } catch (err) {
      logger.logError(err, {
        context: 'get_security_stats',
        userId,
      });
      throw err;
    }
  }
}

module.exports = new SecurityCenterService();

