/**
 * Security Center Service
 * Historique connexions, IP suspectes, révocation de sessions
 */

const logger = require('../utils/logger');
const UserModel = require('../models/userModel');
const mongoose = require('mongoose');

// Utiliser le modèle Session existant de sessionModel.js
// Le schéma est défini dans models/sessionModel.js
const SessionModel = require('../models/sessionModel');
const Session = mongoose.models.Session || mongoose.model('Session');

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
   * Note: Cette méthode est maintenant obsolète car les sessions sont créées via SessionModel.createSession()
   * Elle est conservée pour compatibilité mais ne devrait plus être appelée directement
   */
  async recordSession(userId, refreshToken, ipAddress, userAgent, location = null) {
    try {
      // Mettre à jour la session existante avec la localisation si nécessaire
      const session = await Session.findOne({ 
        user_id: userId, 
        refresh_token: refreshToken 
      });
      
      if (session && location) {
        session.location = location;
        session.last_activity = new Date();
        await session.save();
      }

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
      const mongoose = require('mongoose');
      
      // Convertir userId en ObjectId si c'est une string
      let userIdObj;
      if (typeof userId === 'string') {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return 0;
        }
        userIdObj = new mongoose.Types.ObjectId(userId);
      } else {
        userIdObj = userId;
      }
      
      // Compter les échecs récents (dernières 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentFailures = await LoginHistory.countDocuments({
        user_id: userIdObj,
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
      const mongoose = require('mongoose');
      
      // Convertir userId en ObjectId si c'est une string
      let userIdObj;
      if (typeof userId === 'string') {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          logger.logError(new Error(`Invalid user ID: ${userId}`), { context: 'get_login_history' });
          return [];
        }
        userIdObj = new mongoose.Types.ObjectId(userId);
      } else {
        userIdObj = userId;
      }
      
      const history = await LoginHistory.find({ user_id: userIdObj })
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();

      // Formater pour le frontend
      return history.map(entry => ({
        _id: entry._id.toString(),
        id: entry._id.toString(),
        ip_address: entry.ip_address || 'Inconnu',
        user_agent: entry.user_agent || 'Inconnu',
        location: entry.location || null,
        success: entry.success !== false, // Par défaut true
        failure_reason: entry.failure_reason || null,
        created_at: entry.created_at,
        date: entry.created_at, // Alias pour compatibilité
      }));
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
      const mongoose = require('mongoose');
      const Session = mongoose.models.Session || mongoose.model('Session');
      
      // Convertir userId en ObjectId si c'est une string
      let userIdObj;
      if (typeof userId === 'string') {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          logger.logError(new Error(`Invalid user ID: ${userId}`), { context: 'get_active_sessions' });
          return [];
        }
        userIdObj = new mongoose.Types.ObjectId(userId);
      } else {
        userIdObj = userId;
      }
      
      const sessions = await Session.find({
        user_id: userIdObj,
        is_revoked: false,
        expires_at: { $gt: new Date() }, // Seulement les sessions non expirées
      })
        .sort({ last_activity: -1, created_at: -1 })
        .lean();

      // Formater les sessions pour le frontend
      return sessions.map(session => ({
        _id: session._id.toString(),
        id: session._id.toString(),
        user_agent: session.user_agent || 'Inconnu',
        ip_address: session.ip_address || 'Inconnu',
        location: session.location || null,
        created_at: session.created_at,
        last_activity: session.last_activity || session.updated_at || session.created_at,
        expires_at: session.expires_at,
      }));
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
      const mongoose = require('mongoose');
      const Session = mongoose.models.Session || mongoose.model('Session');
      
      // Valider les IDs
      if (!sessionId) {
        throw new Error('Session ID is required');
      }
      
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        throw new Error('Invalid session ID format');
      }
      
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      const sessionIdObj = new mongoose.Types.ObjectId(sessionId);
      const userIdObj = new mongoose.Types.ObjectId(userId);
      
      // Vérifier que la session existe et appartient à l'utilisateur
      const session = await Session.findOne({
        _id: sessionIdObj,
        user_id: userIdObj,
      }).lean();

      if (!session) {
        throw new Error('Session not found or does not belong to this user');
      }

      // Révoquer la session en utilisant updateOne directement
      const result = await Session.updateOne(
        {
          _id: sessionIdObj,
          user_id: userIdObj,
        },
        {
          $set: {
            is_revoked: true,
            revoked_at: new Date(),
          }
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('Session not found or does not belong to this user');
      }

      logger.logInfo('Session revoked successfully', {
        sessionId,
        userId,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });

      return { success: true, sessionId, userId };
    } catch (err) {
      logger.logError(err, {
        context: 'revoke_session',
        sessionId,
        userId,
        errorMessage: err.message,
      });
      throw err;
    }
  }

  /**
   * Révoker toutes les sessions sauf la session actuelle
   */
  async revokeAllOtherSessions(userId, currentToken) {
    try {
      const mongoose = require('mongoose');
      const Session = mongoose.models.Session || mongoose.model('Session');
      
      // Extraire le refresh token du token Bearer si nécessaire
      const refreshToken = currentToken.replace('Bearer ', '').trim();
      
      const result = await Session.updateMany(
        {
          user_id: userId,
          refresh_token: { $ne: refreshToken }, // Utiliser refresh_token au lieu de token
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
  async updateSessionActivity(refreshToken) {
    try {
      const mongoose = require('mongoose');
      const Session = mongoose.models.Session || mongoose.model('Session');
      
      await Session.updateOne(
        { refresh_token: refreshToken, is_revoked: false }, // Utiliser refresh_token
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
  async isSessionRevoked(refreshToken) {
    try {
      const mongoose = require('mongoose');
      const Session = mongoose.models.Session || mongoose.model('Session');
      
      const session = await Session.findOne({ refresh_token: refreshToken }); // Utiliser refresh_token
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
      const mongoose = require('mongoose');
      const Session = mongoose.models.Session || mongoose.model('Session');
      
      // Convertir userId en ObjectId si c'est une string
      let userIdObj;
      if (typeof userId === 'string') {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          logger.logError(new Error(`Invalid user ID: ${userId}`), { context: 'get_security_stats' });
          return {
            totalLogins: 0,
            successfulLogins: 0,
            failedLogins: 0,
            activeSessions: 0,
            uniqueIPs: 0,
            lastLogin: null,
          };
        }
        userIdObj = new mongoose.Types.ObjectId(userId);
      } else {
        userIdObj = userId;
      }
      
      const [totalLogins, successfulLogins, failedLogins, activeSessions, uniqueIPs] = await Promise.all([
        LoginHistory.countDocuments({ user_id: userIdObj }),
        LoginHistory.countDocuments({ user_id: userIdObj, success: true }),
        LoginHistory.countDocuments({ user_id: userIdObj, success: false }),
        Session.countDocuments({ 
          user_id: userIdObj, 
          is_revoked: false,
          expires_at: { $gt: new Date() } // Seulement les sessions non expirées
        }),
        LoginHistory.distinct('ip_address', { user_id: userIdObj }),
      ]);

      // Dernière connexion
      const lastLogin = await LoginHistory.findOne({ user_id: userIdObj })
        .sort({ created_at: -1 })
        .lean();

      return {
        totalLogins: totalLogins || 0,
        successfulLogins: successfulLogins || 0,
        failedLogins: failedLogins || 0,
        activeSessions: activeSessions || 0,
        uniqueIPs: uniqueIPs ? uniqueIPs.length : 0,
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

