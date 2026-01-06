/**
 * Controller Security Center
 */

const securityCenterService = require('../services/securityCenterService');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

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

    await securityCenterService.revokeSession(sessionId, userId);

    res.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (err) {
    logger.logError(err, {
      context: 'revoke_session',
      userId: req.user?.id,
    });
    next(new AppError('Failed to revoke session', 500));
  }
}

/**
 * Révoker toutes les autres sessions
 */
async function revokeAllOtherSessions(req, res, next) {
  try {
    const userId = req.user.id;
    const currentToken = req.headers.authorization?.replace('Bearer ', '');

    if (!currentToken) {
      return next(new AppError('Current token not found', 400));
    }

    const revokedCount = await securityCenterService.revokeAllOtherSessions(userId, currentToken);

    res.json({
      success: true,
      message: 'All other sessions revoked',
      revokedCount,
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

