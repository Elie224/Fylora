/**
 * Rate Limiting Avancé avec Quotas par Plan
 * Protection contre la charge + quotas utilisateur
 */

const rateLimit = require('express-rate-limit');
const redisCache = require('../utils/redisCache');
const logger = require('../utils/logger');
const planService = require('../services/planService');

/**
 * Rate limiter basé sur le plan utilisateur
 * Les utilisateurs PRO/TEAM ont des limites plus élevées
 */
async function planBasedLimiter(req, res, next) {
  // Ne s'applique qu'aux utilisateurs authentifiés
  if (!req.user || !req.user.id) {
    return next();
  }

  try {
    const userId = req.user.id;
    const planId = req.user.plan || 'free';

    // Récupérer les limites du plan
    const planLimits = getPlanLimits(planId);

    // Vérifier le quota utilisateur (bandwidth, storage, etc.)
    const quotaCheck = await checkUserQuota(userId, planId, req.path);
    
    if (!quotaCheck.allowed) {
      return res.status(429).json({
        error: {
          message: quotaCheck.reason || 'Quota exceeded',
          code: 'QUOTA_EXCEEDED',
          limit: quotaCheck.limit,
          used: quotaCheck.used,
        },
      });
    }

    // Appliquer rate limit selon le plan
    const limiter = rateLimit({
      windowMs: planLimits.windowMs,
      max: planLimits.maxRequests,
      keyGenerator: () => `plan:${planId}:user:${userId}`,
      message: {
        error: {
          message: `Rate limit exceeded for ${planId} plan. Upgrade for higher limits.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    return limiter(req, res, next);
  } catch (err) {
    logger.logError(err, { context: 'plan_based_limiter' });
    // En cas d'erreur, continuer sans rate limit (fail open)
    next();
  }
}

/**
 * Obtenir les limites selon le plan
 */
function getPlanLimits(planId) {
  const limits = {
    free: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      bandwidthPerHour: 100 * 1024 * 1024, // 100 MB/h
    },
    plus: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 500,
      bandwidthPerHour: 1024 * 1024 * 1024, // 1 GB/h
    },
    pro: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 2000,
      bandwidthPerHour: 10 * 1024 * 1024 * 1024, // 10 GB/h
    },
    team: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10000,
      bandwidthPerHour: 100 * 1024 * 1024 * 1024, // 100 GB/h
    },
  };

  return limits[planId] || limits.free;
}

/**
 * Vérifier les quotas utilisateur (bandwidth, storage, etc.)
 */
async function checkUserQuota(userId, planId, path) {
  try {
    // Vérifier le bandwidth horaire
    const bandwidthKey = `quota:bandwidth:${userId}:${new Date().toISOString().slice(0, 13)}`;
    const bandwidthUsed = (await redisCache.get(bandwidthKey)) || 0;
    const planLimits = getPlanLimits(planId);

    if (bandwidthUsed >= planLimits.bandwidthPerHour) {
      return {
        allowed: false,
        reason: 'Hourly bandwidth limit exceeded',
        limit: planLimits.bandwidthPerHour,
        used: bandwidthUsed,
      };
    }

    return { allowed: true };
  } catch (err) {
    logger.logError(err, { context: 'check_user_quota' });
    // En cas d'erreur, autoriser (fail open)
    return { allowed: true };
  }
}

/**
 * Tracker l'utilisation du bandwidth
 */
async function trackBandwidth(userId, bytes) {
  try {
    const bandwidthKey = `quota:bandwidth:${userId}:${new Date().toISOString().slice(0, 13)}`;
    await redisCache.incr(bandwidthKey, 3600); // TTL 1 heure
  } catch (err) {
    logger.logWarn('Failed to track bandwidth', { userId, error: err.message });
  }
}

/**
 * Rate limiter pour uploads avec quota par plan
 */
const uploadQuotaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: async (req) => {
    if (!req.user) return 10; // Limite par défaut pour non authentifiés
    
    const planId = req.user.plan || 'free';
    const limits = {
      free: 10,
      plus: 50,
      pro: 200,
      team: 1000,
    };
    
    return limits[planId] || limits.free;
  },
  keyGenerator: (req) => {
    return req.user?.id ? `upload:user:${req.user.id}` : req.ip;
  },
  message: {
    error: {
      message: 'Upload quota exceeded. Upgrade your plan for more uploads.',
      code: 'UPLOAD_QUOTA_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter pour downloads avec quota par plan
 */
const downloadQuotaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: async (req) => {
    if (!req.user) return 50;
    
    const planId = req.user.plan || 'free';
    const limits = {
      free: 50,
      plus: 200,
      pro: 1000,
      team: 10000,
    };
    
    return limits[planId] || limits.free;
  },
  keyGenerator: (req) => {
    return req.user?.id ? `download:user:${req.user.id}` : req.ip;
  },
  message: {
    error: {
      message: 'Download quota exceeded. Upgrade your plan for more downloads.',
      code: 'DOWNLOAD_QUOTA_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  planBasedLimiter,
  uploadQuotaLimiter,
  downloadQuotaLimiter,
  trackBandwidth,
  checkUserQuota,
};

