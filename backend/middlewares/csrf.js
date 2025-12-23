/**
 * Middleware CSRF Protection
 */

const crypto = require('crypto');

// Stocker les tokens CSRF en mémoire (en production, utiliser Redis)
const csrfTokens = new Map();

/**
 * Générer un token CSRF
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware pour générer et valider les tokens CSRF
 */
function csrfProtection(req, res, next) {
  // Méthodes qui nécessitent une protection CSRF
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (!protectedMethods.includes(req.method)) {
    return next();
  }

  // Récupérer le token depuis le header ou le body
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionId = req.session?.id || req.ip;

  if (!token) {
    return res.status(403).json({
      error: {
        message: 'CSRF token missing',
        status: 403
      }
    });
  }

  // Vérifier le token
  const storedToken = csrfTokens.get(sessionId);
  if (!storedToken || storedToken !== token) {
    return res.status(403).json({
      error: {
        message: 'Invalid CSRF token',
        status: 403
      }
    });
  }

  // Token valide, continuer
  next();
}

/**
 * Middleware pour générer un token CSRF pour les requêtes GET
 */
function generateCSRFTokenMiddleware(req, res, next) {
  const sessionId = req.session?.id || req.ip;
  
  // Générer un nouveau token si nécessaire
  if (!csrfTokens.has(sessionId)) {
    const token = generateCSRFToken();
    csrfTokens.set(sessionId, token);
    res.locals.csrfToken = token;
  } else {
    res.locals.csrfToken = csrfTokens.get(sessionId);
  }

  // Nettoyer les tokens expirés (toutes les heures)
  if (Math.random() < 0.01) { // 1% de chance à chaque requête
    const now = Date.now();
    for (const [key, value] of csrfTokens.entries()) {
      // Supprimer les tokens de plus de 24h
      if (typeof value === 'object' && value.expiresAt < now) {
        csrfTokens.delete(key);
      }
    }
  }

  next();
}

module.exports = {
  csrfProtection,
  generateCSRFTokenMiddleware,
  generateCSRFToken,
};





