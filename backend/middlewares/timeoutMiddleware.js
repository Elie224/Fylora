/**
 * Middleware de timeout strict pour toutes les requêtes
 * Règle: Un service lent est pire qu'un service down
 */

const logger = require('../utils/logger');

/**
 * Timeout middleware - Force une réponse rapide
 * @param {number} timeoutMs - Timeout en millisecondes (défaut: 2000ms pour API)
 */
function timeoutMiddleware(timeoutMs = 2000) {
  return (req, res, next) => {
    // Ne pas appliquer de timeout sur les uploads/downloads de gros fichiers
    if (req.path.includes('/upload') || req.path.includes('/download') || req.path.includes('/stream')) {
      return next();
    }

    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.logWarn('Request timeout', {
          method: req.method,
          path: req.path,
          timeout: timeoutMs,
          userId: req.user?.id,
        });

        res.status(504).json({
          error: {
            message: 'Request timeout - Service took too long to respond',
            code: 'TIMEOUT',
          },
        });
      }
    }, timeoutMs);

    // Nettoyer le timeout quand la réponse est envoyée
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

/**
 * Timeout spécifique pour les requêtes DB
 * @param {number} timeoutMs - Timeout en millisecondes (défaut: 500ms)
 */
function dbTimeout(timeoutMs = 500) {
  return async (req, res, next) => {
    // Wrapper pour les requêtes DB avec timeout
    const originalQuery = req.query;
    
    // Ajouter maxTimeMS à toutes les requêtes MongoDB
    if (req.mongooseQuery) {
      req.mongooseQuery.maxTimeMS(timeoutMs);
    }

    next();
  };
}

/**
 * Timeout pour les tâches lourdes (OCR, preview, etc.)
 * @param {number} timeoutMs - Timeout en millisecondes (défaut: 30000ms = 30s)
 */
function heavyTaskTimeout(timeoutMs = 30000) {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.logWarn('Heavy task timeout', {
          method: req.method,
          path: req.path,
          timeout: timeoutMs,
        });

        res.status(504).json({
          error: {
            message: 'Task timeout - Processing took too long',
            code: 'TASK_TIMEOUT',
          },
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));

    next();
  };
}

module.exports = {
  timeoutMiddleware,
  dbTimeout,
  heavyTaskTimeout,
};

