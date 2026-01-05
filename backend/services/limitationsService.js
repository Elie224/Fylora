/**
 * Service de Limitations par Plan
 * Gère les restrictions: bandwidth, cold storage, etc.
 */

const mongoose = require('mongoose');
const User = mongoose.models.User || mongoose.model('User');
const File = mongoose.models.File || mongoose.model('File');
const planService = require('./planService');
const redisCache = require('../utils/redisCache');
const logger = require('../utils/logger');

/**
 * Vérifier la limite de bandwidth mensuelle
 * @param {string} userId - ID utilisateur
 * @param {number} bytesToAdd - Bytes à ajouter
 * @returns {Promise<Object>} { allowed: boolean, used: number, limit: number, reason?: string }
 */
async function checkBandwidthLimit(userId, bytesToAdd) {
  const user = await User.findById(userId).select('plan').lean();
  const planId = user?.plan || 'free';
  const plan = planService.getPlan(planId);

  const bandwidthLimit = plan.features.bandwidthLimit;
  
  // Illimité
  if (bandwidthLimit === -1) {
    return { allowed: true, used: 0, limit: null };
  }

  // Calculer le mois actuel
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const cacheKey = `bandwidth:${userId}:${monthKey}`;

  // Récupérer depuis le cache
  let used = await redisCache.get(cacheKey) || 0;

  // Vérifier si l'ajout dépasse la limite
  if (used + bytesToAdd > bandwidthLimit) {
    return {
      allowed: false,
      used,
      limit: bandwidthLimit,
      reason: `Bandwidth limit exceeded. Used: ${formatBytes(used)} / ${formatBytes(bandwidthLimit)}`
    };
  }

  return {
    allowed: true,
    used,
    limit: bandwidthLimit,
    available: bandwidthLimit - used
  };
}

/**
 * Ajouter du bandwidth utilisé
 * @param {string} userId - ID utilisateur
 * @param {number} bytes - Bytes utilisés
 */
async function addBandwidthUsage(userId, bytes) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const cacheKey = `bandwidth:${userId}:${monthKey}`;

  // Incrémenter dans Redis
  const current = await redisCache.get(cacheKey) || 0;
  await redisCache.set(cacheKey, current + bytes, 2592000); // 30 jours TTL
}

/**
 * Vérifier et marquer les fichiers pour cold storage (plan FREE uniquement)
 * @param {string} userId - ID utilisateur
 * @returns {Promise<Array>} Fichiers à mettre en cold storage
 */
async function checkColdStorage(userId) {
  const user = await User.findById(userId).select('plan').lean();
  const planId = user?.plan || 'free';
  const plan = planService.getPlan(planId);

  const coldStorageDays = plan.features.coldStorageAfterDays;
  
  // Pas de cold storage pour ce plan
  if (!coldStorageDays) {
    return [];
  }

  // Date limite (X jours sans accès)
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - coldStorageDays);

  try {
    const files = await File.find({
      owner_id: new mongoose.Types.ObjectId(userId),
      is_deleted: false,
      last_accessed_at: { $lt: limitDate },
      cold_storage: { $ne: true }, // Pas déjà en cold storage
    }).select('_id name size').lean().maxTimeMS(5000);

    logger.logInfo('Files eligible for cold storage', {
      userId,
      count: files.length,
      limitDate: limitDate.toISOString()
    });

    return files.map(f => ({
      id: f._id.toString(),
      name: f.name,
      size: f.size
    }));
  } catch (error) {
    logger.logError(error, { context: 'check_cold_storage', userId });
    return [];
  }
}

/**
 * Marquer des fichiers en cold storage
 * @param {Array<string>} fileIds - IDs des fichiers
 */
async function markColdStorage(fileIds) {
  try {
    await File.updateMany(
      { _id: { $in: fileIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { $set: { cold_storage: true, cold_storage_date: new Date() } }
    );

    logger.logInfo('Files marked as cold storage', {
      count: fileIds.length
    });
  } catch (error) {
    logger.logError(error, { context: 'mark_cold_storage', fileIds });
    throw error;
  }
}

/**
 * Vérifier et supprimer les fichiers inactifs (plan FREE uniquement)
 * @param {string} userId - ID utilisateur
 * @returns {Promise<Array>} Fichiers à supprimer
 */
async function checkInactiveFiles(userId) {
  const user = await User.findById(userId).select('plan').lean();
  const planId = user?.plan || 'free';
  const plan = planService.getPlan(planId);

  const deletionMonths = plan.features.deletionAfterMonths;
  
  // Pas de suppression automatique pour ce plan
  if (!deletionMonths) {
    return [];
  }

  // Date limite (X mois sans accès)
  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() - deletionMonths);

  try {
    const files = await File.find({
      owner_id: new mongoose.Types.ObjectId(userId),
      is_deleted: false,
      last_accessed_at: { $lt: limitDate },
      created_at: { $lt: limitDate }, // Créé il y a plus de X mois
    }).select('_id name size created_at last_accessed_at').lean().maxTimeMS(5000);

    logger.logInfo('Files eligible for deletion', {
      userId,
      count: files.length,
      limitDate: limitDate.toISOString()
    });

    return files.map(f => ({
      id: f._id.toString(),
      name: f.name,
      size: f.size,
      created_at: f.created_at,
      last_accessed_at: f.last_accessed_at
    }));
  } catch (error) {
    logger.logError(error, { context: 'check_inactive_files', userId });
    return [];
  }
}

/**
 * Supprimer définitivement des fichiers inactifs
 * @param {Array<string>} fileIds - IDs des fichiers
 */
async function deleteInactiveFiles(fileIds) {
  try {
    // Soft delete
    await File.updateMany(
      { _id: { $in: fileIds.map(id => new mongoose.Types.ObjectId(id)) } },
      { $set: { is_deleted: true, deleted_at: new Date() } }
    );

    logger.logInfo('Inactive files deleted', {
      count: fileIds.length
    });
  } catch (error) {
    logger.logError(error, { context: 'delete_inactive_files', fileIds });
    throw error;
  }
}

/**
 * Job périodique pour gérer cold storage et suppression
 */
async function processLimitations() {
  try {
    const users = await User.find({ plan: 'free' }).select('_id').lean();
    
    for (const user of users) {
      const userId = user._id.toString();
      
      // Vérifier cold storage
      const coldStorageFiles = await checkColdStorage(userId);
      if (coldStorageFiles.length > 0) {
        await markColdStorage(coldStorageFiles.map(f => f.id));
      }

      // Vérifier fichiers inactifs
      const inactiveFiles = await checkInactiveFiles(userId);
      if (inactiveFiles.length > 0) {
        // Envoyer une notification avant suppression
        logger.logWarn('Inactive files detected', {
          userId,
          count: inactiveFiles.length
        });
        // TODO: Envoyer email de notification
      }
    }

    logger.logInfo('Limitations processing completed', {
      usersProcessed: users.length
    });
  } catch (error) {
    logger.logError(error, { context: 'process_limitations' });
  }
}

/**
 * Formater les bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Job périodique (toutes les 24 heures)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    processLimitations().catch(err => {
      logger.logError(err, { context: 'periodic_limitations' });
    });
  }, 24 * 60 * 60 * 1000); // 24 heures
}

module.exports = {
  checkBandwidthLimit,
  addBandwidthUsage,
  checkColdStorage,
  markColdStorage,
  checkInactiveFiles,
  deleteInactiveFiles,
  processLimitations,
};

