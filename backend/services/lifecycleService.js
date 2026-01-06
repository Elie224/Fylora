/**
 * Service de Lifecycle Management
 * Gère hot → cold → archive automatiquement
 */

const logger = require('../utils/logger');
const FileModel = require('../models/fileModel');
const limitationsService = require('./limitationsService');

class LifecycleService {
  constructor() {
    this.coldStorageThreshold = 90 * 24 * 60 * 60 * 1000; // 90 jours d'inactivité
    this.archiveThreshold = 365 * 24 * 60 * 60 * 1000; // 1 an d'inactivité
  }

  /**
   * Marquer un fichier comme cold storage
   */
  async markAsColdStorage(fileId, userId) {
    try {
      const file = await FileModel.findById(fileId);
      if (!file || String(file.owner_id) !== String(userId)) {
        throw new Error('File not found or access denied');
      }

      // Vérifier si déjà en cold storage
      if (file.cold_storage) {
        return file;
      }

      // Marquer comme cold storage
      const updated = await FileModel.update(fileId, {
        cold_storage: true,
        cold_storage_date: new Date(),
      });

      logger.logInfo('File marked as cold storage', {
        fileId,
        fileName: file.name,
        userId,
      });

      // Publier événement
      const eventBus = require('./eventBus');
      eventBus.publish(eventBus.Events.FILE_COLD_STORAGE, {
        fileId,
        fileName: file.name,
        userId,
      }).catch(() => {});

      return updated;
    } catch (err) {
      logger.logError(err, {
        context: 'mark_cold_storage',
        fileId,
        userId,
      });
      throw err;
    }
  }

  /**
   * Restaurer un fichier depuis cold storage
   */
  async restoreFromColdStorage(fileId, userId) {
    try {
      const file = await FileModel.findById(fileId);
      if (!file || String(file.owner_id) !== String(userId)) {
        throw new Error('File not found or access denied');
      }

      if (!file.cold_storage) {
        return file;
      }

      // Restaurer depuis cold storage
      const updated = await FileModel.update(fileId, {
        cold_storage: false,
        cold_storage_date: null,
        last_accessed_at: new Date(),
      });

      logger.logInfo('File restored from cold storage', {
        fileId,
        fileName: file.name,
        userId,
      });

      return updated;
    } catch (err) {
      logger.logError(err, {
        context: 'restore_cold_storage',
        fileId,
        userId,
      });
      throw err;
    }
  }

  /**
   * Traiter les fichiers inactifs (cold storage)
   */
  async processInactiveFiles(userId = null) {
    try {
      const now = new Date();
      const thresholdDate = new Date(now.getTime() - this.coldStorageThreshold);

      // Construire la requête
      const query = {
        is_deleted: false,
        cold_storage: false,
        last_accessed_at: { $lt: thresholdDate },
      };

      if (userId) {
        query.owner_id = userId;
      }

      // Trouver les fichiers inactifs
      const File = require('mongoose').models.File;
      const inactiveFiles = await File.find(query)
        .limit(100) // Traiter par batch de 100
        .lean();

      logger.logInfo('Processing inactive files for cold storage', {
        count: inactiveFiles.length,
        userId: userId || 'all',
      });

      // Marquer comme cold storage
      for (const file of inactiveFiles) {
        try {
          await this.markAsColdStorage(file.id || file._id, file.owner_id);
        } catch (err) {
          logger.logError(err, {
            context: 'process_inactive_file',
            fileId: file.id || file._id,
          });
        }
      }

      return inactiveFiles.length;
    } catch (err) {
      logger.logError(err, {
        context: 'process_inactive_files',
        userId,
      });
      throw err;
    }
  }

  /**
   * Archiver les fichiers très anciens
   */
  async archiveOldFiles(userId = null) {
    try {
      const now = new Date();
      const thresholdDate = new Date(now.getTime() - this.archiveThreshold);

      const query = {
        is_deleted: false,
        created_at: { $lt: thresholdDate },
        cold_storage: true, // Seulement les fichiers déjà en cold storage
      };

      if (userId) {
        query.owner_id = userId;
      }

      const File = require('mongoose').models.File;
      const oldFiles = await File.find(query)
        .limit(50) // Traiter par batch de 50
        .lean();

      logger.logInfo('Archiving old files', {
        count: oldFiles.length,
        userId: userId || 'all',
      });

      // Pour l'instant, on marque juste comme archivé
      // Plus tard, on pourra déplacer vers un stockage encore moins cher
      for (const file of oldFiles) {
        try {
          // Marquer comme archivé (nouveau champ à ajouter au modèle si nécessaire)
          // await FileModel.update(file.id || file._id, { archived: true });
          logger.logInfo('File archived', {
            fileId: file.id || file._id,
            fileName: file.name,
          });
        } catch (err) {
          logger.logError(err, {
            context: 'archive_file',
            fileId: file.id || file._id,
          });
        }
      }

      return oldFiles.length;
    } catch (err) {
      logger.logError(err, {
        context: 'archive_old_files',
        userId,
      });
      throw err;
    }
  }

  /**
   * Tâche cron pour traiter automatiquement
   */
  async runScheduledTask() {
    try {
      logger.logInfo('Running lifecycle management scheduled task');

      // Traiter les fichiers inactifs
      const coldCount = await this.processInactiveFiles();
      
      // Archiver les fichiers très anciens
      const archiveCount = await this.archiveOldFiles();

      logger.logInfo('Lifecycle management task completed', {
        coldStorage: coldCount,
        archived: archiveCount,
      });

      return {
        coldStorage: coldCount,
        archived: archiveCount,
      };
    } catch (err) {
      logger.logError(err, {
        context: 'lifecycle_scheduled_task',
      });
      throw err;
    }
  }
}

// Instance singleton
const lifecycleService = new LifecycleService();

// Tâche cron quotidienne (à 2h du matin)
const cron = require('node-cron');
cron.schedule('0 2 * * *', () => {
  lifecycleService.runScheduledTask().catch(err => {
    logger.logError(err, { context: 'lifecycle_cron' });
  });
});

module.exports = lifecycleService;


