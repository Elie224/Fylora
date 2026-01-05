const UserModel = require('../models/userModel');
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const { calculateRealQuotaUsed, syncQuotaUsed } = require('../utils/quota');
const logger = require('../utils/logger');
const smartCache = require('../utils/smartCache');
const QueryOptimizer = require('../utils/queryOptimizer');

// Obtenir les statistiques du dashboard
async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;

    // Vérifier le cache Redis en premier pour éviter les requêtes coûteuses
    try {
      const cachedDashboard = await smartCache.getCachedDashboard(userId);
      if (cachedDashboard) {
        return res.status(200).json({
          data: cachedDashboard,
        });
      }
    } catch (cacheErr) {
      // Si le cache échoue, continuer avec la requête normale
      logger.logWarn('Cache check failed, proceeding with normal query', { userId, error: cacheErr.message });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    // Utiliser des agrégations MongoDB pour meilleures performances
    const mongoose = require('mongoose');
    const File = mongoose.models.File || mongoose.model('File');
    const Folder = mongoose.models.Folder || mongoose.model('Folder');
    const ownerObjectId = new mongoose.Types.ObjectId(userId);

    // Optimisation: Utiliser des index et simplifier les requêtes
    // Exécuter toutes les requêtes en parallèle pour meilleures performances
    const [
      breakdownAggregation,
      recentFiles,
      totalFiles,
      totalFolders
    ] = await Promise.all([
    // Calculer la répartition par type avec agrégation MongoDB optimisée
    // Utiliser $in au lieu de regexMatch pour de meilleures performances
      File.aggregate([
      { 
        $match: { 
          owner_id: ownerObjectId, 
          is_deleted: false 
        } 
      },
      {
        $group: {
          _id: null,
          images: {
            $sum: {
              $cond: [
                { $regexMatch: { input: '$mime_type', regex: '^image/' } }, 
                '$size', 
                0
              ]
            }
          },
          videos: {
            $sum: {
              $cond: [
                { $regexMatch: { input: '$mime_type', regex: '^video/' } }, 
                '$size', 
                0
              ]
            }
          },
          audio: {
            $sum: {
              $cond: [
                { $regexMatch: { input: '$mime_type', regex: '^audio/' } }, 
                '$size', 
                0
              ]
            }
          },
          documents: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $regexMatch: { input: '$mime_type', regex: 'pdf' } },
                    { $regexMatch: { input: '$mime_type', regex: 'document' } },
                    { $regexMatch: { input: '$mime_type', regex: 'text' } },
                    { $regexMatch: { input: '$mime_type', regex: 'spreadsheet' } }
                  ]
                },
                '$size',
                0
              ]
            }
          },
          total: { $sum: '$size' }
        }
      },
      // Limiter les résultats pour éviter les calculs inutiles
      { $limit: 1 }
      ], {
        allowDiskUse: true, // Permettre l'utilisation du disque pour les grandes collections
        maxTimeMS: 2000 // Timeout de 2 secondes pour l'agrégation
      }),
      // Récupérer les 5 derniers fichiers modifiés avec requête optimisée
      File.find({ 
        owner_id: ownerObjectId, 
        is_deleted: false 
      })
        .sort({ updated_at: -1 })
        .limit(5)
        .select('name size mime_type updated_at _id')
        .lean()
        .maxTimeMS(2000), // Timeout de 2 secondes
      // Compter les fichiers avec countDocuments (plus rapide)
      File.countDocuments({ 
        owner_id: ownerObjectId, 
        is_deleted: false 
      }).maxTimeMS(2000), // Timeout de 2 secondes
      // Compter les dossiers avec countDocuments (plus rapide)
      Folder.countDocuments({ 
        owner_id: ownerObjectId, 
        is_deleted: false 
      }).maxTimeMS(2000) // Timeout de 2 secondes
    ]);

    const breakdown = breakdownAggregation[0] || {
      images: 0,
      videos: 0,
      documents: 0,
      audio: 0,
      total: 0
    };
    breakdown.other = breakdown.total - breakdown.images - breakdown.videos - breakdown.documents - breakdown.audio;

    // Utiliser le quota stocké pour éviter le recalcul coûteux à chaque requête
    // La synchronisation se fait en arrière-plan ou après les opérations sur fichiers
    let quotaUsed = user.quota_used || 0;
    
    // Vérifier périodiquement (seulement 10% des requêtes) pour éviter la surcharge
    // Cela réduit drastiquement le temps de réponse moyen
    const shouldVerify = Math.random() < 0.1; // 10% de chance
    
    if (shouldVerify) {
      // Vérifier en arrière-plan sans bloquer la réponse
      calculateRealQuotaUsed(userId).then(quotaUsedReal => {
        const storedQuotaUsed = user.quota_used || 0;
        if (Math.abs(quotaUsedReal - storedQuotaUsed) > 1024 * 1024) { // Seulement si différence > 1MB
          syncQuotaUsed(userId).catch(err => {
            logger.logError(err, { context: 'background quota sync' });
          });
        }
      }).catch(err => {
        logger.logError(err, { context: 'background quota calculation' });
      });
    }
    const quotaLimit = user.quota_limit || 1099511627776; // 1 TO par défaut si non défini
    // Calculer le pourcentage brut (avec décimales)
    const rawPercentage = quotaLimit > 0 && quotaUsed > 0 
      ? (quotaUsed / quotaLimit) * 100 
      : 0;
    // Pour l'affichage, arrondir à 2 décimales si < 1%, sinon arrondir à l'entier
    const percentageDisplay = rawPercentage < 1 
      ? Math.max(0.01, parseFloat(rawPercentage.toFixed(2)))
      : Math.round(rawPercentage);
    
    const dashboardData = {
      quota: {
        used: quotaUsed,
        limit: quotaLimit,
        available: Math.max(0, quotaLimit - quotaUsed),
        percentage: percentageDisplay,
        percentageRaw: rawPercentage, // Pourcentage brut pour la barre de progression
      },
      breakdown: {
        images: breakdown.images,
        videos: breakdown.videos,
        documents: breakdown.documents,
        audio: breakdown.audio,
        other: breakdown.other,
        total: breakdown.images + breakdown.videos + breakdown.documents + breakdown.audio + breakdown.other,
      },
      recent_files: recentFiles.map(f => ({
        id: f._id.toString(),
        name: f.name,
        size: f.size,
        mime_type: f.mime_type,
        updated_at: f.updated_at ? (f.updated_at instanceof Date ? f.updated_at.toISOString() : f.updated_at) : new Date().toISOString(),
      })),
      total_files: totalFiles,
      total_folders: totalFolders,
    };

    // Mettre en cache (TTL 5 minutes)
    await smartCache.cacheDashboard(userId, dashboardData, 300);

    res.status(200).json({
      data: dashboardData,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
};

