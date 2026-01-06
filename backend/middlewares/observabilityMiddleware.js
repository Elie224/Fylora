/**
 * Middleware d'Observabilité
 * Enregistre les métriques pour chaque requête
 */

const observabilityService = require('../services/observabilityService');

function observabilityMiddleware(req, res, next) {
  const startTime = Date.now();
  const method = req.method;
  const endpoint = req.path || req.route?.path || 'unknown';

  // Enregistrer la requête après la réponse
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Enregistrer la requête
    observabilityService.recordRequest(method, endpoint, statusCode, duration);

    // Enregistrer les erreurs
    if (statusCode >= 400) {
      const error = new Error(`HTTP ${statusCode}`);
      error.statusCode = statusCode;
      observabilityService.recordError(error, {
        endpoint: `${method} ${endpoint}`,
        userId: req.user?.id,
      });
    }

    // Enregistrer une trace
    observabilityService.recordTrace(`${method} ${endpoint}`, duration, {
      statusCode,
      userId: req.user?.id,
      ip: req.ip,
    });
  });

  next();
}

module.exports = observabilityMiddleware;

