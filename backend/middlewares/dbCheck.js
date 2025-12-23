/**
 * Middleware pour vérifier la connexion MongoDB avant de traiter les requêtes
 */
const db = require('../models/db');
const logger = require('../utils/logger');

function dbCheckMiddleware(req, res, next) {
  // Ne pas bloquer les routes de santé
  if (req.path === '/health' || req.path === '/api/health' || req.path.startsWith('/health')) {
    return next();
  }

  // Vérifier si MongoDB est connecté
  const readyState = db.connection?.readyState;
  
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (readyState !== 1) {
    logger.logWarn('Database connection check failed', {
      method: req.method,
      url: req.originalUrl,
      readyState: readyState,
      states: {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      }[readyState] || 'unknown',
    });

    return res.status(503).json({
      error: {
        status: 503,
        message: 'Connexion à la base de données impossible. Veuillez réessayer dans un instant.',
        code: 'DATABASE_UNAVAILABLE',
        details: readyState === 2 
          ? 'La connexion à la base de données est en cours...'
          : 'Vérifiez que MongoDB est démarré et accessible.',
      },
    });
  }

  next();
}

module.exports = dbCheckMiddleware;

