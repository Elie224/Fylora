/**
 * Service pour les statistiques personnelles
 * Fichiers les plus ouverts, inutilisés, récents
 */
const FileUsage = require('../models/FileUsage');
const FileModel = require('../models/fileModel');
const mongoose = require('mongoose');

class StatisticsService {
  /**
   * Obtenir les fichiers les plus ouverts
   */
  async getMostOpenedFiles(userId, limit = 10) {
    try {
      const File = mongoose.models.File || mongoose.model('File');
      
      const mostOpened = await FileUsage.aggregate([
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(userId),
            action_type: { $in: ['open', 'download', 'preview'] },
          },
        },
        {
          $group: {
            _id: '$file_id',
            total_accesses: { $sum: '$access_count' },
            last_accessed: { $max: '$last_accessed_at' },
          },
        },
        {
          $sort: { total_accesses: -1 },
        },
        {
          $limit: limit,
        },
      ]);

      const fileIds = mostOpened.map(item => item._id);
      const files = await File.find({
        _id: { $in: fileIds },
        is_deleted: false,
      }).lean();

      // Créer un map pour les stats
      const statsMap = new Map();
      mostOpened.forEach(stat => {
        statsMap.set(stat._id.toString(), {
          total_accesses: stat.total_accesses,
          last_accessed: stat.last_accessed,
        });
      });

      return files.map(file => ({
        ...FileModel.toDTO(file),
        statistics: statsMap.get(file._id.toString()),
      }));
    } catch (error) {
      console.error('Error getting most opened files:', error);
      throw error;
    }
  }

  /**
   * Obtenir les fichiers inutilisés
   */
  async getUnusedFiles(userId, daysThreshold = 90, limit = 50) {
    try {
      const File = mongoose.models.File || mongoose.model('File');
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      // Fichiers avec dernière utilisation avant le seuil
      const unusedUsage = await FileUsage.find({
        user_id: new mongoose.Types.ObjectId(userId),
        last_accessed_at: { $lt: thresholdDate },
      })
        .sort({ last_accessed_at: 1 })
        .limit(limit)
        .select('file_id last_accessed_at')
        .lean();

      const fileIds = unusedUsage.map(u => u.file_id);
      
      // Fichiers jamais ouverts
      const allFiles = await File.find({
        owner_id: new mongoose.Types.ObjectId(userId),
        is_deleted: false,
      }).select('_id created_at').lean();

      const usedFileIds = new Set(fileIds.map(id => id.toString()));
      const neverUsedFiles = allFiles
        .filter(f => !usedFileIds.has(f._id.toString()))
        .filter(f => f.created_at < thresholdDate)
        .slice(0, limit - fileIds.length);

      const allUnusedIds = [
        ...fileIds,
        ...neverUsedFiles.map(f => f._id),
      ];

      const files = await File.find({
        _id: { $in: allUnusedIds },
        is_deleted: false,
      }).lean();

      return files.map(file => FileModel.toDTO(file));
    } catch (error) {
      console.error('Error getting unused files:', error);
      throw error;
    }
  }

  /**
   * Obtenir les fichiers récents
   */
  async getRecentFiles(userId, limit = 20) {
    try {
      const recentUsage = await FileUsage.find({
        user_id: new mongoose.Types.ObjectId(userId),
      })
        .sort({ last_accessed_at: -1 })
        .limit(limit)
        .select('file_id last_accessed_at action_type')
        .lean();

      const fileIds = recentUsage.map(u => u.file_id);
      const files = await FileModel.findByOwner(userId, null, false, { limit });

      // Enrichir avec les données d'utilisation
      const usageMap = new Map();
      recentUsage.forEach(u => {
        usageMap.set(u.file_id.toString(), {
          last_accessed_at: u.last_accessed_at,
          action_type: u.action_type,
        });
      });

      return files.map(file => ({
        ...file,
        usage: usageMap.get(file.id),
      }));
    } catch (error) {
      console.error('Error getting recent files:', error);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques complètes
   */
  async getPersonalStatistics(userId) {
    try {
      const [mostOpened, unused, recent] = await Promise.all([
        this.getMostOpenedFiles(userId, 10),
        this.getUnusedFiles(userId, 90, 20),
        this.getRecentFiles(userId, 20),
      ]);

      // Statistiques globales
      const totalAccesses = await FileUsage.aggregate([
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$access_count' },
          },
        },
      ]);

      const accessByType = await FileUsage.aggregate([
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $group: {
            _id: '$action_type',
            count: { $sum: '$access_count' },
          },
        },
      ]);

      return {
        most_opened: mostOpened,
        unused: unused,
        recent: recent,
        total_accesses: totalAccesses[0]?.total || 0,
        access_by_type: accessByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      };
    } catch (error) {
      console.error('Error getting personal statistics:', error);
      throw error;
    }
  }
}

module.exports = new StatisticsService();


