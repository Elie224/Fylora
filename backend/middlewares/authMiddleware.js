// Middleware d'authentification JWT
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Vérifie que le token JWT est valide et l'ajoute à req.user
 */
function authMiddleware(req, res, next) {
  try {
    // Récupérer le token du header Authorization
    const token = req.headers.authorization?.split(' ')[1]; // "Bearer <token>"

    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Please provide a JWT token in Authorization header',
      });
    }

    // Vérifier et décoder le token avec algorithme explicite pour la sécurité
    const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
    req.user = decoded;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please refresh your token.',
      });
    }

    return res.status(403).json({
      error: 'Invalid token',
      message: 'The token provided is invalid or malformed.',
    });
  }
}

/**
 * Optionnel : middleware pour les routes publiques qui acceptent optionnellement un token
 */
function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
        req.user = decoded;
        // Logger pour déboguer
        if (process.env.NODE_ENV === 'development') {
          console.log('Optional auth: User authenticated', {
            userId: decoded.id || decoded._id,
            hasId: !!decoded.id,
            has_id: !!decoded._id,
            keys: Object.keys(decoded)
          });
        }
      } catch (err) {
        // Si le token est invalide ou expiré, ne pas définir req.user
        // Logger seulement en développement
        if (process.env.NODE_ENV === 'development') {
          console.warn('Optional auth: Token invalid or expired', err.message);
        }
      }
    } else {
      // Pas de token - route publique
      if (process.env.NODE_ENV === 'development') {
        console.log('Optional auth: No token provided');
      }
    }

    next();
  } catch (err) {
    // Ignorer l'erreur - route publique
    next();
  }
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
};







