/**
 * Middleware pour enregistrer les activités des utilisateurs
 */
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

/**
 * Enregistrer une activité
 */
const logActivity = async (req, actionType, resourceType, resourceId, details = {}) => {
  try {
    if (!req.user || !req.user.id) {
      return; // Pas d'utilisateur, pas de log
    }

    await ActivityLog.create({
      user_id: req.user.id,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      details: {
        ...details,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
      },
    });
  } catch (error) {
    // Ne pas bloquer la requête en cas d'erreur de logging
    logger.logError(error, { context: 'logActivity' });
  }
};

/**
 * Middleware pour logger automatiquement certaines actions
 */
const activityLogger = (actionType, resourceType, getResourceId = (req) => req.params.id) => {
  return async (req, res, next) => {
    // Logger après que la réponse soit envoyée
    const originalSend = res.send;
    res.send = function (data) {
      const resourceId = getResourceId(req);
      logActivity(req, actionType, resourceType, resourceId, {
        status_code: res.statusCode,
      });
      return originalSend.call(this, data);
    };
    next();
  };
};

module.exports = {
  logActivity,
  activityLogger,
};





