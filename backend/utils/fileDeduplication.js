/**
 * Déduplication de fichiers côté serveur
 * Évite de stocker plusieurs fois le même fichier
 */
const FileFingerprint = require('../models/FileFingerprint');
const FileModel = require('../models/fileModel');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FileDeduplication {
  /**
   * Vérifier si un fichier existe déjà (même contenu)
   */
  async checkDuplicate(userId, filePath) {
    try {
      // Calculer le hash du fichier
      const { sha256Hash } = await this.calculateHash(filePath);
      
      // Chercher les fichiers avec le même hash
      const existing = await FileFingerprint.findOne({
        user_id: userId,
        sha256_hash: sha256Hash,
      }).populate('file_id').lean();

      if (existing && existing.file_id) {
        return {
          isDuplicate: true,
          existingFileId: existing.file_id._id.toString(),
          existingFilePath: existing.file_id.file_path,
        };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('Deduplication check error:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Créer un lien symbolique vers un fichier existant au lieu de copier
   */
  async createSymlink(existingPath, newPath) {
    try {
      // Créer le répertoire de destination
      await fs.mkdir(path.dirname(newPath), { recursive: true });
      
      // Créer le lien symbolique
      await fs.symlink(existingPath, newPath);
      
      return true;
    } catch (error) {
      // Si symlink échoue (Windows), copier le fichier
      if (error.code === 'EPERM' || error.code === 'ENOENT') {
        await fs.copyFile(existingPath, newPath);
        return true;
      }
      throw error;
    }
  }

  /**
   * Calculer le hash d'un fichier
   */
  async calculateHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = require('fs').createReadStream(filePath);
      
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve({ sha256Hash: hash.digest('hex') }));
      stream.on('error', reject);
    });
  }

  /**
   * Nettoyer les fichiers orphelins (plus référencés)
   */
  async cleanupOrphanedFiles() {
    try {
      const File = require('../models/fileModel');
      const allFiles = await File.find({ is_deleted: false }).lean();
      
      const orphaned = [];
      for (const file of allFiles) {
        try {
          await fs.access(file.file_path);
        } catch {
          orphaned.push(file._id);
        }
      }

      if (orphaned.length > 0) {
        await File.updateMany(
          { _id: { $in: orphaned } },
          { is_deleted: true, deleted_at: new Date() }
        );
      }

      return { cleaned: orphaned.length };
    } catch (error) {
      console.error('Cleanup orphaned files error:', error);
      return { cleaned: 0 };
    }
  }
}

module.exports = new FileDeduplication();


