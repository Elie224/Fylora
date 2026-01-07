/**
 * Controller Security Center
 */

const securityCenterService = require('../services/securityCenterService');
const logger = require('../utils/logger');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Obtenir l'historique des connexions
 */
async function getLoginHistory(req, res, next) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const history = await securityCenterService.getLoginHistory(userId, limit);

    res.json({
      success: true,
      data: history,
    });
  } catch (err) {
    logger.logError(err, {
      context: 'get_login_history',
      userId: req.user?.id,
    });
    next(new AppError('Failed to get login history', 500));
  }
}

/**
 * Obtenir les sessions actives
 */
async function getActiveSessions(req, res, next) {
  try {
    const userId = req.user.id;

    const sessions = await securityCenterService.getActiveSessions(userId);

    res.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    logger.logError(err, {
      context: 'get_active_sessions',
      userId: req.user?.id,
    });
    next(new AppError('Failed to get active sessions', 500));
  }
}

/**
 * Révoker une session
 */
async function revokeSession(req, res, next) {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    if (!sessionId) {
      return next(new AppError('Session ID is required', 400));
    }

    await securityCenterService.revokeSession(sessionId, userId);

    res.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (err) {
    logger.logError(err, {
      context: 'revoke_session',
      userId: req.user?.id,
      sessionId: req.params?.sessionId,
    });
    
    // Retourner un message d'erreur plus spécifique
    if (err.message && (err.message.includes('not found') || err.message.includes('Invalid'))) {
      return next(new AppError(err.message, 404));
    }
    
    next(new AppError('Failed to revoke session', 500));
  }
}

/**
 * Révoker toutes les autres sessions
 */
async function revokeAllOtherSessions(req, res, next) {
  try {
    const userId = req.user.id;
    // Le refresh token devrait être envoyé dans le body, pas dans l'Authorization header
    // Car l'Authorization header contient l'access token, pas le refresh token
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return next(new AppError('Refresh token not found', 400));
    }

    const revokedCount = await securityCenterService.revokeAllOtherSessions(userId, refresh_token);

    res.json({
      success: true,
      message: 'All other sessions revoked',
      data: { revokedCount },
    });
  } catch (err) {
    logger.logError(err, {
      context: 'revoke_all_other_sessions',
      userId: req.user?.id,
    });
    next(new AppError('Failed to revoke sessions', 500));
  }
}

/**
 * Obtenir les statistiques de sécurité
 */
async function getSecurityStats(req, res, next) {
  try {
    const userId = req.user.id;

    const stats = await securityCenterService.getSecurityStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    logger.logError(err, {
      context: 'get_security_stats',
      userId: req.user?.id,
    });
    next(new AppError('Failed to get security stats', 500));
  }
}

module.exports = {
  getLoginHistory,
  getActiveSessions,
  revokeSession,
  revokeAllOtherSessions,
  getSecurityStats,
};

