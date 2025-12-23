// Rate limiting middleware pour protéger contre les attaques de force brute
const rateLimit = require('express-rate-limit');

// Rate limiter général pour toutes les routes
// En développement, limite plus élevée. En production, limite plus stricte.
const isDevelopment = process.env.NODE_ENV !== 'production';
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 2000 : 100, // Limite beaucoup plus élevée en développement (2000 req/15min)
  message: {
    error: {
      message: 'Too many requests from this IP, please try again later.',
      status: 429,
    },
  },
  standardHeaders: true, // Retourner les headers de rate limit dans `RateLimit-*`
  legacyHeaders: false, // Désactiver les headers `X-RateLimit-*`
  skip: (req) => {
    // Ignorer les requêtes OPTIONS (preflight CORS)
    return req.method === 'OPTIONS';
  },
});

// Rate limiter strict pour l'authentification (protection contre force brute)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limite de 5 tentatives de connexion par IP
  message: {
    error: {
      message: 'Too many login attempts from this IP, please try again after 15 minutes.',
      status: 429,
    },
  },
  skipSuccessfulRequests: true, // Ne pas compter les requêtes réussies
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter pour les uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 50, // Limite de 50 uploads par IP par heure
  message: {
    error: {
      message: 'Too many uploads from this IP, please try again later.',
      status: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter pour les partages publics (protection contre abus)
const shareLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20, // Limite de 20 partages créés par IP par heure
  message: {
    error: {
      message: 'Too many shares created from this IP, please try again later.',
      status: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter pour les routes API authentifiées (basé sur l'utilisateur, pas l'IP)
// Ce limiter doit être appliqué APRÈS l'authentification pour avoir accès à req.user
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 5000 : 500, // Limite très élevée en développement, raisonnable en production
  keyGenerator: (req) => {
    // Utiliser l'ID utilisateur si authentifié, sinon l'IP
    return req.user?.id ? `user:${req.user.id}` : req.ip;
  },
  message: {
    error: {
      message: 'Too many requests, please try again later.',
      status: 429,
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Ignorer les requêtes OPTIONS (preflight CORS)
    return req.method === 'OPTIONS';
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  uploadLimiter,
  shareLimiter,
  apiLimiter,
};


