/**
 * Optimiseur de base de données pour améliorer les performances
 * Analyse et optimise les requêtes MongoDB
 */

const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Analyser une requête avec explain()
 */
async function explainQuery(query, options = {}) {
  try {
    const explainResult = await query.explain('executionStats');
    
    if (explainResult.executionStats) {
      const stats = explainResult.executionStats;
      
      // Détecter les problèmes de performance
      if (stats.executionTimeMillis > 1000) {
        logger.logWarn('Slow query detected', {
          executionTime: stats.executionTimeMillis,
          totalDocsExamined: stats.totalDocsExamined,
          totalKeysExamined: stats.totalKeysExamined,
        });
      }

      // Vérifier si un index est utilisé
      if (stats.executionStages && stats.executionStages.stage === 'COLLSCAN') {
        logger.logWarn('Collection scan detected - index missing', {
          stage: stats.executionStages.stage,
        });
      }

      return explainResult;
    }
  } catch (err) {
    logger.logError(err, { context: 'explain_query' });
  }
  return null;
}

/**
 * Créer un index si nécessaire
 */
async function ensureIndex(collection, indexSpec, options = {}) {
  try {
    const collectionObj = mongoose.connection.collection(collection);
    const indexes = await collectionObj.indexes();
    
    const indexExists = indexes.some(idx => {
      const keys = Object.keys(idx.key);
      const specKeys = Object.keys(indexSpec);
      return keys.length === specKeys.length &&
             keys.every(k => idx.key[k] === indexSpec[k]);
    });

    if (!indexExists) {
      await collectionObj.createIndex(indexSpec, options);
      logger.logInfo('Index created', { collection, index: indexSpec });
    }
  } catch (err) {
    logger.logError(err, { context: 'ensure_index', collection });
  }
}

/**
 * Optimiser les requêtes avec projection minimale
 */
function optimizeProjection(fields) {
  // Retourner seulement les champs nécessaires
  const projection = {};
  fields.forEach(field => {
    projection[field] = 1;
  });
  return projection;
}

/**
 * Optimiser les requêtes avec pagination
 */
function optimizePagination(skip, limit, maxLimit = 100) {
  const skipNum = Math.max(0, parseInt(skip) || 0);
  const limitNum = Math.min(maxLimit, Math.max(1, parseInt(limit) || 50));
  return { skip: skipNum, limit: limitNum };
}

/**
 * Précharger les données fréquemment utilisées
 */
async function preloadCommonData(userId) {
  try {
    const File = mongoose.models.File || mongoose.model('File');
    const Folder = mongoose.models.Folder || mongoose.model('Folder');
    const ownerObjectId = new mongoose.Types.ObjectId(userId);

    // Précharger les données en parallèle
    const [rootFolder, recentFiles] = await Promise.all([
      Folder.findOne({ owner_id: ownerObjectId, parent_id: null }).lean(),
      File.find({ owner_id: ownerObjectId, is_deleted: false })
        .sort({ updated_at: -1 })
        .limit(10)
        .select('name size mime_type updated_at _id')
        .lean()
        .maxTimeMS(1000),
    ]);

    return { rootFolder, recentFiles };
  } catch (err) {
    logger.logError(err, { context: 'preload_common_data', userId });
    return { rootFolder: null, recentFiles: [] };
  }
}

/**
 * Nettoyer les données obsolètes
 */
async function cleanupOldData() {
  try {
    const File = mongoose.models.File || mongoose.model('File');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Supprimer les fichiers soft-deleted depuis plus de 30 jours
    const result = await File.deleteMany({
      is_deleted: true,
      deleted_at: { $lt: thirtyDaysAgo }
    });

    logger.logInfo('Cleanup completed', { deletedCount: result.deletedCount });
    return result;
  } catch (err) {
    logger.logError(err, { context: 'cleanup_old_data' });
    return null;
  }
}

/**
 * Analyser les statistiques de la collection
 */
async function analyzeCollection(collectionName) {
  try {
    const collection = mongoose.connection.collection(collectionName);
    const stats = await collection.stats();
    
    logger.logInfo('Collection stats', {
      collection: collectionName,
      count: stats.count,
      size: stats.size,
      avgObjSize: stats.avgObjSize,
      indexes: stats.nindexes,
      indexSize: stats.totalIndexSize,
    });

    return stats;
  } catch (err) {
    logger.logError(err, { context: 'analyze_collection', collection: collectionName });
    return null;
  }
}

module.exports = {
  explainQuery,
  ensureIndex,
  optimizeProjection,
  optimizePagination,
  preloadCommonData,
  cleanupOldData,
  analyzeCollection,
};

