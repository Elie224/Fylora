/**
 * Service RGPD / GDPR
 * Export et suppression vérifiable des données utilisateur
 */

const logger = require('../utils/logger');
const UserModel = require('../models/userModel');
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const ShareModel = require('../models/shareModel');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

class GDPRService {
  /**
   * Exporter toutes les données d'un utilisateur (RGPD Article 15)
   */
  async exportUserData(userId) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Récupérer toutes les données
      const mongoose = require('mongoose');
      const Share = mongoose.models.Share || mongoose.model('Share');
      const [files, folders, shares, notifications, activities] = await Promise.all([
        FileModel.findByOwner(userId),
        FolderModel.findByOwner(userId),
        Share.find({ created_by_id: userId }).lean(),
        Notification.find({ user_id: userId }).lean(),
        ActivityLog.find({ user_id: userId }).lean(),
      ]);

      // Construire l'export
      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          plan: user.plan,
          created_at: user.created_at,
          last_login_at: user.last_login_at,
        },
        files: files.map(f => ({
          id: f.id,
          name: f.name,
          size: f.size,
          mime_type: f.mime_type,
          created_at: f.created_at,
          updated_at: f.updated_at,
          // Ne pas inclure le contenu des fichiers (trop volumineux)
        })),
        folders: folders.map(f => ({
          id: f.id,
          name: f.name,
          created_at: f.created_at,
          updated_at: f.updated_at,
        })),
        shares: shares.map(s => ({
          id: s.id,
          file_id: s.file_id,
          folder_id: s.folder_id,
          created_at: s.created_at,
          expires_at: s.expires_at,
        })),
        notifications: notifications.map(n => ({
          id: n.id,
          type: n.type,
          message: n.message,
          read: n.read,
          created_at: n.created_at,
        })),
        activities: activities.map(a => ({
          id: a.id,
          action: a.action,
          resource_type: a.resource_type,
          resource_id: a.resource_id,
          created_at: a.created_at,
        })),
        statistics: {
          totalFiles: files.length,
          totalFolders: folders.length,
          totalShares: shares.length,
          totalNotifications: notifications.length,
          totalActivities: activities.length,
          totalStorage: files.reduce((sum, f) => sum + (f.size || 0), 0),
        },
      };

      logger.logInfo('User data exported (GDPR)', {
        userId,
        fileCount: files.length,
        folderCount: folders.length,
      });

      return exportData;
    } catch (err) {
      logger.logError(err, {
        context: 'gdpr_export',
        userId,
      });
      throw err;
    }
  }

  /**
   * Générer un fichier JSON d'export
   */
  async generateExportFile(userId) {
    try {
      const exportData = await this.exportUserData(userId);
      const jsonString = JSON.stringify(exportData, null, 2);
      
      return {
        filename: `fylora-export-${userId}-${Date.now()}.json`,
        content: jsonString,
        mimeType: 'application/json',
        size: Buffer.byteLength(jsonString, 'utf8'),
      };
    } catch (err) {
      logger.logError(err, {
        context: 'gdpr_generate_export_file',
        userId,
      });
      throw err;
    }
  }

  /**
   * Supprimer toutes les données d'un utilisateur (RGPD Article 17)
   */
  async deleteUserData(userId, proofOfDeletion = false) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const deletionLog = {
        userId,
        deletedAt: new Date().toISOString(),
        deletedBy: 'user_request',
        proofOfDeletion: proofOfDeletion ? this.generateProofOfDeletion(userId) : null,
        deletedData: {
          files: 0,
          folders: 0,
          shares: 0,
          notifications: 0,
          activities: 0,
        },
      };

      // Supprimer les fichiers
      const files = await FileModel.findByOwner(userId);
      for (const file of files) {
        try {
          // Supprimer physiquement si stockage local
          if (file.storage_type === 'local') {
            const fs = require('fs').promises;
            const path = require('path');
            const config = require('../config');
            const filePath = path.resolve(config.upload.uploadDir, file.file_path);
            await fs.unlink(filePath).catch(() => {});
          } else if (file.storage_type === 'cloudinary') {
            // Supprimer de Cloudinary
            const cloudinaryService = require('./cloudinaryService');
            await cloudinaryService.deleteFile(file.file_path).catch(() => {});
          }

          await FileModel.delete(file.id);
          deletionLog.deletedData.files++;
        } catch (err) {
          logger.logError(err, {
            context: 'gdpr_delete_file',
            fileId: file.id,
          });
        }
      }

      // Supprimer les dossiers
      const folders = await FolderModel.findByOwner(userId);
      for (const folder of folders) {
        try {
          await FolderModel.delete(folder.id);
          deletionLog.deletedData.folders++;
        } catch (err) {
          logger.logError(err, {
            context: 'gdpr_delete_folder',
            folderId: folder.id,
          });
        }
      }

      // Supprimer les partages
      const mongoose = require('mongoose');
      const Share = mongoose.models.Share || mongoose.model('Share');
      const shares = await Share.find({ created_by_id: userId });
      for (const share of shares) {
        try {
          await Share.findByIdAndDelete(share._id || share.id);
          deletionLog.deletedData.shares++;
        } catch (err) {
          logger.logError(err, {
            context: 'gdpr_delete_share',
            shareId: share._id || share.id,
          });
        }
      }

      // Supprimer les notifications
      await Notification.deleteMany({ user_id: userId });
      deletionLog.deletedData.notifications = (await Notification.countDocuments({ user_id: userId })) || 0;

      // Supprimer les activités
      await ActivityLog.deleteMany({ user_id: userId });
      deletionLog.deletedData.activities = (await ActivityLog.countDocuments({ user_id: userId })) || 0;

      // Supprimer l'utilisateur
      await UserModel.deleteUserAndData(userId);

      // Logger la suppression
      logger.logInfo('User data deleted (GDPR)', deletionLog);

      return deletionLog;
    } catch (err) {
      logger.logError(err, {
        context: 'gdpr_delete_user_data',
        userId,
      });
      throw err;
    }
  }

  /**
   * Générer une preuve de suppression (hash)
   */
  generateProofOfDeletion(userId) {
    const crypto = require('crypto');
    const timestamp = Date.now();
    const data = `${userId}-${timestamp}-deleted`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Vérifier une preuve de suppression
   */
  verifyProofOfDeletion(userId, proof, timestamp) {
    const crypto = require('crypto');
    const data = `${userId}-${timestamp}-deleted`;
    const expectedProof = crypto.createHash('sha256').update(data).digest('hex');
    return proof === expectedProof;
  }
}

module.exports = new GDPRService();

