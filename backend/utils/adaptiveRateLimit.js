/**
 * Rate limiting adaptatif
 * Ajuste les limites selon la charge et le comportement
 */
const rateLimit = require('express-rate-limit');

class AdaptiveRateLimit {
  constructor() {
    this.limits = new Map();
    this.metrics = new Map();
  }

  /**
   * Créer un rate limiter adaptatif
   */
  createAdaptiveLimiter(baseConfig = {}) {
    const {
      windowMs = 15 * 60 * 1000, // 15 minutes
      max = 100, // Requêtes par fenêtre
      keyGenerator = (req) => req.ip,
      skipSuccessfulRequests = false,
    } = baseConfig;

    const limiter = rateLimit({
      windowMs,
      max: (req) => this.getAdaptiveMax(req, max),
      keyGenerator,
      skipSuccessfulRequests,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        const key = keyGenerator(req);
        this.recordLimitHit(key);
        
        res.status(429).json({
          error: {
            message: 'Too many requests',
            retryAfter: Math.ceil(windowMs / 1000),
          },
        });
      },
    });

    return limiter;
  }

  /**
   * Obtenir le max adaptatif selon la charge
   */
  getAdaptiveMax(req, baseMax) {
    const key = this.getKey(req);
    const metrics = this.metrics.get(key) || { hits: 0, errors: 0 };

    // Réduire la limite si beaucoup d'erreurs
    if (metrics.errors > metrics.hits * 0.1) {
      return Math.max(baseMax * 0.5, 10);
    }

    // Augmenter la limite si bon comportement
    if (metrics.errors === 0 && metrics.hits > 50) {
      return Math.min(baseMax * 1.5, baseMax * 2);
    }

    return baseMax;
  }

  /**
   * Enregistrer un hit de limite
   */
  recordLimitHit(key) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, { hits: 0, errors: 0 });
    }
    const metrics = this.metrics.get(key);
    metrics.hits++;
  }

  /**
   * Enregistrer une erreur
   */
  recordError(key) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, { hits: 0, errors: 0 });
    }
    const metrics = this.metrics.get(key);
    metrics.errors++;
  }

  /**
   * Obtenir la clé pour un requête
   */
  getKey(req) {
    return req.ip || req.user?.id || 'anonymous';
  }

  /**
   * Nettoyer les métriques anciennes
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 heure

    this.metrics.forEach((metrics, key) => {
      if (metrics.lastAccess && now - metrics.lastAccess > maxAge) {
        this.metrics.delete(key);
      }
    });
  }
}

// Rate limiters adaptatifs pré-configurés
const adaptiveRateLimit = new AdaptiveRateLimit();

// Rate limiter pour authentification (plus strict)
const authLimiter = adaptiveRateLimit.createAdaptiveLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 tentatives par 15 minutes
  keyGenerator: (req) => req.ip,
});

// Rate limiter pour upload (moyen)
const uploadLimiter = adaptiveRateLimit.createAdaptiveLimiter({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 100, // 100 uploads par heure
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Rate limiter pour API générale (plus permissif)
const apiLimiter = adaptiveRateLimit.createAdaptiveLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 requêtes par 15 minutes
  keyGenerator: (req) => req.user?.id || req.ip,
});

// Nettoyer les métriques toutes les heures
setInterval(() => {
  adaptiveRateLimit.cleanup();
}, 60 * 60 * 1000);

module.exports = {
  adaptiveRateLimit,
  authLimiter,
  uploadLimiter,
  apiLimiter,
};


