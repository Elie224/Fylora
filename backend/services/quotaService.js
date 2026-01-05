/**
 * Service de Gestion de Quota (1 To par utilisateur)
 * Gestion asynchrone avec cache Redis
 * 
 * Architecture: Mise à jour async, vérification synchrone rapide
 */

const mongoose = require('mongoose');
const User = mongoose.models.User || mongoose.model('User');
const File = mongoose.models.File || mongoose.model('File');
const redisCache = require('../utils/redisCache');
const logger = require('../utils/logger');

// Constantes
const DEFAULT_QUOTA_LIMIT = 100 * 1024 * 1024 * 1024; // 100 Go en bytes (plan FREE)
const QUOTA_CACHE_TTL = 300; // 5 minutes
const SYNC_INTERVAL = 3600000; // 1 heure

/**
 * Obtenir le quota d'un utilisateur (avec cache)
 * @param {string} userId - ID utilisateur
 * @returns {Promise<Object>} { used, limit, available, percentage }
 */
async function getUserQuota(userId) {
  const cacheKey = `quota:${userId}`;
  
  // Vérifier le cache Redis d'abord
  try {
    const cached = await redisCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  } catch (err) {
    // Continuer si cache échoue
  }

  // Récupérer depuis MongoDB
  const user = await User.findById(userId).select('quota_used quota_limit').lean();
  if (!user) {
    throw new Error('User not found');
  }

  const used = user.quota_used || 0;
  const limit = user.quota_limit || DEFAULT_QUOTA_LIMIT;
  const available = Math.max(0, limit - used);
  const percentage = limit > 0 ? (used / limit) * 100 : 0;

  const quota = {
    used,
    limit,
    available,
    percentage: Math.round(percentage * 100) / 100, // 2 décimales
  };

  // Mettre en cache
  redisCache.set(cacheKey, quota, QUOTA_CACHE_TTL).catch(() => {});

  return quota;
}

/**
 * Vérifier si l'utilisateur a assez de quota
 * @param {string} userId - ID utilisateur
 * @param {number} requiredBytes - Bytes nécessaires
 * @returns {Promise<Object>} { hasQuota: boolean, available: number, required: number }
 */
async function checkQuota(userId, requiredBytes) {
  const quota = await getUserQuota(userId);
  const hasQuota = quota.available >= requiredBytes;

  return {
    hasQuota,
    available: quota.available,
    required: requiredBytes,
    limit: quota.limit,
    used: quota.used,
  };
}

/**
 * Réserver du quota (vérification synchrone rapide)
 * @param {string} userId - ID utilisateur
 * @param {number} bytes - Bytes à réserver
 * @returns {Promise<boolean>} true si réservé, false si quota insuffisant
 */
async function reserveQuota(userId, bytes) {
  const check = await checkQuota(userId, bytes);
  
  if (!check.hasQuota) {
    logger.logWarn('Quota insufficient', {
      userId,
      available: check.available,
      required: check.required,
      limit: check.limit
    });
    return false;
  }

  // Mise à jour optimiste (async)
  updateQuotaAsync(userId, bytes).catch(err => {
    logger.logError(err, { context: 'reserve_quota_async', userId, bytes });
  });

  // Invalider le cache
  redisCache.del(`quota:${userId}`).catch(() => {});

  return true;
}

/**
 * Libérer du quota (après suppression)
 * @param {string} userId - ID utilisateur
 * @param {number} bytes - Bytes à libérer
 */
async function releaseQuota(userId, bytes) {
  updateQuotaAsync(userId, -bytes).catch(err => {
    logger.logError(err, { context: 'release_quota_async', userId, bytes });
  });

  // Invalider le cache
  redisCache.del(`quota:${userId}`).catch(() => {});
}

/**
 * Mettre à jour le quota de manière asynchrone
 * @param {string} userId - ID utilisateur
 * @param {number} deltaBytes - Différence de bytes (+ ou -)
 */
async function updateQuotaAsync(userId, deltaBytes) {
  try {
    await User.findByIdAndUpdate(
      userId,
      { $inc: { quota_used: deltaBytes } },
      { new: true }
    );

    // Invalider le cache
    redisCache.del(`quota:${userId}`).catch(() => {});
  } catch (error) {
    logger.logError(error, { context: 'update_quota_async', userId, deltaBytes });
    throw error;
  }
}

/**
 * Synchroniser le quota avec la réalité (recalcul depuis les fichiers)
 * À exécuter périodiquement pour éviter les décalages
 * @param {string} userId - ID utilisateur
 * @returns {Promise<Object>} { oldQuota, newQuota, difference }
 */
async function syncQuota(userId) {
  try {
    // Calculer le quota réel depuis les fichiers
    const result = await File.aggregate([
      {
        $match: {
          owner_id: new mongoose.Types.ObjectId(userId),
          is_deleted: false,
        },
      },
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$size' },
        },
      },
    ]).maxTimeMS(5000);

    const realQuotaUsed = result[0]?.totalSize || 0;

    // Récupérer le quota stocké
    const user = await User.findById(userId).select('quota_used').lean();
    const storedQuotaUsed = user?.quota_used || 0;

    // Mettre à jour si différence significative (> 1 MB)
    const difference = Math.abs(realQuotaUsed - storedQuotaUsed);
    if (difference > 1024 * 1024) {
      await User.findByIdAndUpdate(userId, {
        quota_used: realQuotaUsed,
      });

      // Invalider le cache
      redisCache.del(`quota:${userId}`).catch(() => {});

      logger.logInfo('Quota synced', {
        userId,
        oldQuota: storedQuotaUsed,
        newQuota: realQuotaUsed,
        difference,
      });
    }

    return {
      oldQuota: storedQuotaUsed,
      newQuota: realQuotaUsed,
      difference,
    };
  } catch (error) {
    logger.logError(error, { context: 'sync_quota', userId });
    throw error;
  }
}

/**
 * Synchroniser le quota pour tous les utilisateurs (job périodique)
 */
async function syncAllQuotas() {
  try {
    const users = await User.find({}).select('_id').lean();
    let synced = 0;
    let errors = 0;

    for (const user of users) {
      try {
        await syncQuota(user._id.toString());
        synced++;
      } catch (err) {
        errors++;
        logger.logError(err, { context: 'sync_all_quotas', userId: user._id });
      }
    }

    logger.logInfo('Quota sync completed', {
      total: users.length,
      synced,
      errors,
    });

    return { total: users.length, synced, errors };
  } catch (error) {
    logger.logError(error, { context: 'sync_all_quotas' });
    throw error;
  }
}

/**
 * Étendre le quota d'un utilisateur (admin uniquement)
 * @param {string} userId - ID utilisateur
 * @param {number} newLimitBytes - Nouvelle limite en bytes
 */
async function extendQuota(userId, newLimitBytes) {
  try {
    await User.findByIdAndUpdate(userId, {
      quota_limit: newLimitBytes,
    });

    // Invalider le cache
    redisCache.del(`quota:${userId}`).catch(() => {});

    logger.logInfo('Quota extended', {
      userId,
      newLimit: newLimitBytes,
    });
  } catch (error) {
    logger.logError(error, { context: 'extend_quota', userId, newLimitBytes });
    throw error;
  }
}

/**
 * Obtenir les statistiques de quota globales (admin)
 * @returns {Promise<Object>} { totalUsers, totalUsed, totalLimit, averageUsage }
 */
async function getGlobalQuotaStats() {
  try {
    const result = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalUsed: { $sum: '$quota_used' },
          totalLimit: { $sum: '$quota_limit' },
          averageUsed: { $avg: '$quota_used' },
          averageLimit: { $avg: '$quota_limit' },
        },
      },
    ]).maxTimeMS(5000);

    const stats = result[0] || {
      totalUsers: 0,
      totalUsed: 0,
      totalLimit: 0,
      averageUsed: 0,
      averageLimit: 0,
    };

    return {
      totalUsers: stats.totalUsers,
      totalUsed: stats.totalUsed,
      totalLimit: stats.totalLimit,
      averageUsage: stats.averageLimit > 0 
        ? (stats.averageUsed / stats.averageLimit) * 100 
        : 0,
      totalUsagePercentage: stats.totalLimit > 0
        ? (stats.totalUsed / stats.totalLimit) * 100
        : 0,
    };
  } catch (error) {
    logger.logError(error, { context: 'get_global_quota_stats' });
    throw error;
  }
}

// Démarrer la synchronisation périodique
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    syncAllQuotas().catch(err => {
      logger.logError(err, { context: 'periodic_quota_sync' });
    });
  }, SYNC_INTERVAL);
}

module.exports = {
  // Quota utilisateur
  getUserQuota,
  checkQuota,
  reserveQuota,
  releaseQuota,
  updateQuotaAsync,
  
  // Synchronisation
  syncQuota,
  syncAllQuotas,
  
  // Admin
  extendQuota,
  getGlobalQuotaStats,
  
  // Constantes
  DEFAULT_QUOTA_LIMIT,
};

