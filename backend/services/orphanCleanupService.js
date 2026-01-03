/**
 * Service de nettoyage des entrées orphelines dans la base de données
 * Vérifie périodiquement que les fichiers en base existent physiquement
 */
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

class OrphanCleanupService {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.stats = {
      filesChecked: 0,
      orphansFound: 0,
      orphansDeleted: 0,
      errors: 0
    };
  }

  /**
   * Vérifier un fichier individuel
   */
  async checkFile(file) {
    try {
      if (!file.file_path) {
        logger.logWarn('File has no file_path', { fileId: file._id || file.id });
        return { isOrphan: true, reason: 'no_file_path' };
      }

      // Résoudre le chemin du fichier
      let filePath;
      if (path.isAbsolute(file.file_path)) {
        filePath = file.file_path;
      } else {
        filePath = path.resolve(config.upload.uploadDir, file.file_path);
      }

      // Vérifier que le fichier existe
      try {
        await fs.access(filePath);
        return { isOrphan: false };
      } catch (accessErr) {
        logger.logWarn('File not found on disk', {
          fileId: file._id || file.id,
          fileName: file.name,
          filePath,
          originalPath: file.file_path
        });
        return { isOrphan: true, reason: 'file_not_found', filePath };
      }
    } catch (err) {
      logger.logError('Error checking file', {
        fileId: file._id || file.id,
        error: err.message
      });
      return { isOrphan: false, error: err.message };
    }
  }

  /**
   * Nettoyer les fichiers orphelins pour un utilisateur
   */
  async cleanupUserOrphans(userId, options = {}) {
    const { dryRun = false, limit = 100 } = options;
    let checked = 0;
    let orphans = 0;
    let deleted = 0;
    let errors = 0;

    try {
      // Récupérer les fichiers de l'utilisateur par lots
      const mongoose = require('mongoose');
      const File = mongoose.models.File || mongoose.model('File');
      
      let skip = 0;
      let hasMore = true;

      while (hasMore && checked < limit) {
        const files = await File.find({
          owner_id: new mongoose.Types.ObjectId(userId),
          is_deleted: false
        })
          .select('_id name file_path owner_id')
          .lean()
          .limit(50)
          .skip(skip);

        if (files.length === 0) {
          hasMore = false;
          break;
        }

        for (const file of files) {
          checked++;
          const checkResult = await this.checkFile(file);

          if (checkResult.isOrphan) {
            orphans++;
            
            if (!dryRun) {
              try {
                // Marquer comme supprimé plutôt que de supprimer complètement
                // pour permettre une récupération si nécessaire
                await File.updateOne(
                  { _id: file._id },
                  { 
                    $set: { 
                      is_deleted: true,
                      deleted_at: new Date()
                    }
                  }
                );
                deleted++;
                
                logger.logInfo('Orphan file marked as deleted', {
                  fileId: file._id,
                  fileName: file.name,
                  reason: checkResult.reason
                });
              } catch (deleteErr) {
                errors++;
                logger.logError('Error deleting orphan file', {
                  fileId: file._id,
                  error: deleteErr.message
                });
              }
            } else {
              logger.logInfo('Orphan file found (dry run)', {
                fileId: file._id,
                fileName: file.name,
                reason: checkResult.reason
              });
            }
          }

          // Limiter le nombre de fichiers vérifiés par exécution
          if (checked >= limit) {
            hasMore = false;
            break;
          }
        }

        skip += files.length;
      }

      return { checked, orphans, deleted, errors };
    } catch (err) {
      logger.logError('Error in cleanupUserOrphans', {
        userId,
        error: err.message,
        stack: err.stack
      });
      throw err;
    }
  }

  /**
   * Nettoyer les fichiers orphelins pour tous les utilisateurs
   */
  async cleanupAllOrphans(options = {}) {
    if (this.isRunning) {
      logger.logWarn('Cleanup already running, skipping');
      return this.stats;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.logInfo('Starting orphan cleanup', options);

      const mongoose = require('mongoose');
      const User = mongoose.models.User || mongoose.model('User');
      
      // Récupérer tous les utilisateurs
      const users = await User.find({})
        .select('_id email')
        .lean();

      let totalChecked = 0;
      let totalOrphans = 0;
      let totalDeleted = 0;
      let totalErrors = 0;

      // Traiter chaque utilisateur
      for (const user of users) {
        try {
          const result = await this.cleanupUserOrphans(user._id.toString(), {
            ...options,
            limit: 50 // Limiter par utilisateur pour ne pas surcharger
          });

          totalChecked += result.checked;
          totalOrphans += result.orphans;
          totalDeleted += result.deleted;
          totalErrors += result.errors;
        } catch (userErr) {
          totalErrors++;
          logger.logError('Error cleaning up user orphans', {
            userId: user._id,
            error: userErr.message
          });
        }
      }

      const duration = Date.now() - startTime;
      
      this.stats = {
        filesChecked: totalChecked,
        orphansFound: totalOrphans,
        orphansDeleted: totalDeleted,
        errors: totalErrors,
        duration,
        lastRun: new Date()
      };

      logger.logInfo('Orphan cleanup completed', this.stats);

      return this.stats;
    } catch (err) {
      logger.logError('Error in cleanupAllOrphans', {
        error: err.message,
        stack: err.stack
      });
      throw err;
    } finally {
      this.isRunning = false;
      this.lastRun = new Date();
    }
  }

  /**
   * Obtenir les statistiques du dernier nettoyage
   */
  getStats() {
    return {
      ...this.stats,
      lastRun: this.lastRun,
      isRunning: this.isRunning
    };
  }
}

module.exports = new OrphanCleanupService();
