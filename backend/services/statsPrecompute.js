/**
 * Pré-calcul de statistiques pour performance optimale
 * Calcule les stats en arrière-plan et les met en cache
 */
const smartCache = require('../utils/smartCache');
const mongoose = require('mongoose');
const cron = require('node-cron');

class StatsPrecompute {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Pré-calculer les statistiques du dashboard
   */
  async precomputeDashboardStats(userId) {
    const File = mongoose.models.File;
    const Folder = mongoose.models.Folder;
    const ownerObjectId = new mongoose.Types.ObjectId(userId);

    // Calculer en parallèle
    const [fileStats, folderStats, breakdown] = await Promise.all([
      // Stats fichiers
      File.aggregate([
        { $match: { owner_id: ownerObjectId, is_deleted: false } },
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalSize: { $sum: '$size' },
          },
        },
      ]),
      // Stats dossiers
      Folder.aggregate([
        { $match: { owner_id: ownerObjectId, is_deleted: false } },
        {
          $group: {
            _id: null,
            totalFolders: { $sum: 1 },
          },
        },
      ]),
      // Breakdown par type
      File.aggregate([
        { $match: { owner_id: ownerObjectId, is_deleted: false } },
        {
          $group: {
            _id: null,
            images: {
              $sum: {
                $cond: [{ $regexMatch: { input: '$mime_type', regex: '^image/' } }, '$size', 0],
              },
            },
            videos: {
              $sum: {
                $cond: [{ $regexMatch: { input: '$mime_type', regex: '^video/' } }, '$size', 0],
              },
            },
            documents: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $regexMatch: { input: '$mime_type', regex: 'pdf' } },
                      { $regexMatch: { input: '$mime_type', regex: 'document' } },
                      { $regexMatch: { input: '$mime_type', regex: 'text' } },
                    ],
                  },
                  '$size',
                  0,
                ],
              },
            },
            audio: {
              $sum: {
                $cond: [{ $regexMatch: { input: '$mime_type', regex: '^audio/' } }, '$size', 0],
              },
            },
            other: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $not: { $regexMatch: { input: '$mime_type', regex: '^image/' } } },
                      { $not: { $regexMatch: { input: '$mime_type', regex: '^video/' } } },
                      { $not: { $regexMatch: { input: '$mime_type', regex: '^audio/' } } },
                      { $not: { $regexMatch: { input: '$mime_type', regex: 'pdf|document|text' } } },
                    ],
                  },
                  '$size',
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const stats = {
      totalFiles: fileStats[0]?.totalFiles || 0,
      totalFolders: folderStats[0]?.totalFolders || 0,
      totalSize: fileStats[0]?.totalSize || 0,
      breakdown: breakdown[0] || {
        images: 0,
        videos: 0,
        documents: 0,
        audio: 0,
        other: 0,
      },
      computedAt: new Date(),
    };

    // Mettre en cache
    await smartCache.cacheDashboard(userId, stats, 600); // 10 minutes

    return stats;
  }

  /**
   * Pré-calculer les stats pour tous les utilisateurs actifs
   */
  async precomputeAllActiveUsers() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const User = mongoose.models.User;
      const users = await User.find({ is_active: true })
        .select('_id')
        .limit(100) // Limiter pour éviter surcharge
        .lean();

      // Pré-calculer en parallèle (batch de 10)
      const batchSize = 10;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await Promise.all(
          batch.map(user => this.precomputeDashboardStats(user._id.toString()))
        );
      }

      console.log(`✅ Precomputed stats for ${users.length} users`);
    } catch (error) {
      console.error('Error precomputing stats:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Démarrer le scheduler de pré-calcul
   */
  startScheduler() {
    // Pré-calculer toutes les 5 minutes
    cron.schedule('*/5 * * * *', () => {
      this.precomputeAllActiveUsers();
    });

    // Pré-calculer au démarrage
    setTimeout(() => {
      this.precomputeAllActiveUsers();
    }, 30000); // Attendre 30 secondes après démarrage
  }
}

module.exports = new StatsPrecompute();


