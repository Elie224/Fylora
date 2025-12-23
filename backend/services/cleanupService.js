/**
 * Service de nettoyage guidé
 * Suggestions de fichiers à supprimer pour libérer de l'espace
 */
const FileModel = require('../models/fileModel');
const FileUsage = require('../models/FileUsage');
const FileRecommendation = require('../models/FileRecommendation');
const StatisticsService = require('./statisticsService');
const mongoose = require('mongoose');

class CleanupService {
  /**
   * Analyser et suggérer des fichiers à supprimer
   */
  async analyzeCleanup(userId) {
    try {
      const suggestions = [];

      // 1. Fichiers inutilisés depuis longtemps
      const unusedFiles = await StatisticsService.getUnusedFiles(userId, 180, 50);
      if (unusedFiles.length > 0) {
        const totalSize = unusedFiles.reduce((sum, f) => sum + f.size, 0);
        suggestions.push({
          type: 'unused_files',
          title: 'Fichiers inutilisés',
          description: `${unusedFiles.length} fichiers non ouverts depuis plus de 6 mois`,
          files: unusedFiles.slice(0, 10),
          estimated_space_freed: totalSize,
          confidence_score: 0.8,
        });
      }

      // 2. Doublons (nécessite FileFingerprint)
      const duplicates = await this.findDuplicates(userId);
      if (duplicates.length > 0) {
        const totalSize = duplicates.reduce((sum, d) => sum + d.size, 0);
        suggestions.push({
          type: 'duplicates',
          title: 'Fichiers en double',
          description: `${duplicates.length} fichiers dupliqués détectés`,
          files: duplicates.slice(0, 10),
          estimated_space_freed: totalSize,
          confidence_score: 0.9,
        });
      }

      // 3. Fichiers très volumineux peu utilisés
      const largeUnused = await this.findLargeUnusedFiles(userId);
      if (largeUnused.length > 0) {
        const totalSize = largeUnused.reduce((sum, f) => sum + f.size, 0);
        suggestions.push({
          type: 'large_unused',
          title: 'Gros fichiers peu utilisés',
          description: `${largeUnused.length} fichiers volumineux (>100MB) peu utilisés`,
          files: largeUnused.slice(0, 10),
          estimated_space_freed: totalSize,
          confidence_score: 0.7,
        });
      }

      // 4. Fichiers temporaires
      const tempFiles = await this.findTempFiles(userId);
      if (tempFiles.length > 0) {
        const totalSize = tempFiles.reduce((sum, f) => sum + f.size, 0);
        suggestions.push({
          type: 'temp_files',
          title: 'Fichiers temporaires',
          description: `${tempFiles.length} fichiers temporaires détectés`,
          files: tempFiles.slice(0, 10),
          estimated_space_freed: totalSize,
          confidence_score: 0.95,
        });
      }

      // Sauvegarder les suggestions
      for (const suggestion of suggestions) {
        await FileRecommendation.create({
          user_id: userId,
          recommendation_type: 'cleanup_old_files',
          file_ids: suggestion.files.map(f => f.id),
          suggested_action: `Supprimer ${suggestion.files.length} fichiers pour libérer ${this.formatBytes(suggestion.estimated_space_freed)}`,
          details: {
            type: suggestion.type,
            title: suggestion.title,
            description: suggestion.description,
          },
          confidence_score: suggestion.confidence_score,
          estimated_space_freed: suggestion.estimated_space_freed,
        });
      }

      return {
        suggestions,
        total_space_freed: suggestions.reduce((sum, s) => sum + s.estimated_space_freed, 0),
        formatted_total: this.formatBytes(
          suggestions.reduce((sum, s) => sum + s.estimated_space_freed, 0)
        ),
      };
    } catch (error) {
      console.error('Error analyzing cleanup:', error);
      throw error;
    }
  }

  /**
   * Trouver les doublons
   */
  async findDuplicates(userId) {
    try {
      const FileFingerprint = require('../models/FileFingerprint');
      const File = mongoose.models.File || mongoose.model('File');

      // Trouver les hashs dupliqués
      const duplicates = await FileFingerprint.aggregate([
        {
          $match: {
            user_id: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $group: {
            _id: '$content_hash',
            files: { $push: '$file_id' },
            count: { $sum: 1 },
          },
        },
        {
          $match: {
            count: { $gt: 1 },
          },
        },
      ]);

      const duplicateFiles = [];
      for (const dup of duplicates) {
        // Prendre tous sauf le premier comme doublons
        const fileIds = dup.files.slice(1);
        const files = await File.find({
          _id: { $in: fileIds },
          is_deleted: false,
        }).lean();

        duplicateFiles.push(...files.map(f => FileModel.toDTO(f)));
      }

      return duplicateFiles;
    } catch (error) {
      console.error('Error finding duplicates:', error);
      return [];
    }
  }

  /**
   * Trouver les gros fichiers peu utilisés
   */
  async findLargeUnusedFiles(userId, minSize = 100 * 1024 * 1024) {
    try {
      const File = mongoose.models.File || mongoose.model('File');
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - 90);

      // Fichiers volumineux
      const largeFiles = await File.find({
        owner_id: new mongoose.Types.ObjectId(userId),
        is_deleted: false,
        size: { $gte: minSize },
      }).lean();

      // Vérifier l'utilisation
      const fileIds = largeFiles.map(f => f._id);
      const usage = await FileUsage.find({
        file_id: { $in: fileIds },
        last_accessed_at: { $lt: thresholdDate },
      }).select('file_id').lean();

      const unusedFileIds = new Set(usage.map(u => u.file_id.toString()));
      const largeUnused = largeFiles.filter(f =>
        unusedFileIds.has(f._id.toString()) || !usage.find(u => u.file_id.toString() === f._id.toString())
      );

      return largeUnused.map(f => FileModel.toDTO(f));
    } catch (error) {
      console.error('Error finding large unused files:', error);
      return [];
    }
  }

  /**
   * Trouver les fichiers temporaires
   */
  async findTempFiles(userId) {
    try {
      const File = mongoose.models.File || mongoose.model('File');
      const tempPatterns = [
        /^temp/i,
        /^tmp/i,
        /~$/,
        /\.tmp$/i,
        /\.temp$/i,
        /^\./,
      ];

      const allFiles = await File.find({
        owner_id: new mongoose.Types.ObjectId(userId),
        is_deleted: false,
      }).lean();

      return allFiles
        .filter(f => tempPatterns.some(pattern => pattern.test(f.name)))
        .map(f => FileModel.toDTO(f));
    } catch (error) {
      console.error('Error finding temp files:', error);
      return [];
    }
  }

  /**
   * Formater les bytes en format lisible
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = new CleanupService();


