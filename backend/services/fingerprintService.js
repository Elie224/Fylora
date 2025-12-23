/**
 * Service pour l'empreinte unique de fichier
 */
const FileFingerprint = require('../models/FileFingerprint');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class FingerprintService {
  /**
   * Créer ou mettre à jour l'empreinte d'un fichier
   */
  async createFingerprint(fileId, userId, filePath, mimeType, fileSize) {
    try {
      // Calculer les hashs
      const { md5Hash, sha256Hash, quickHash } = await this.calculateHashes(filePath);

      // Vérifier si l'empreinte existe déjà
      let fingerprint = await FileFingerprint.findOne({ file_id: fileId });
      
      if (fingerprint) {
        // Mettre à jour
        fingerprint.content_hash = md5Hash;
        fingerprint.sha256_hash = sha256Hash;
        fingerprint.quick_hash = quickHash;
        fingerprint.file_size = fileSize;
        fingerprint.mime_type = mimeType;
        fingerprint.verified_at = new Date();
      } else {
        // Créer nouveau
        fingerprint = new FileFingerprint({
          file_id: fileId,
          user_id: userId,
          content_hash: md5Hash,
          sha256_hash: sha256Hash,
          quick_hash: quickHash,
          file_size: fileSize,
          mime_type: mimeType,
        });
      }

      await fingerprint.save();
      return fingerprint;
    } catch (error) {
      console.error('Error creating fingerprint:', error);
      throw error;
    }
  }

  /**
   * Calculer les hashs d'un fichier
   */
  async calculateHashes(filePath) {
    return new Promise((resolve, reject) => {
      const md5Hash = crypto.createHash('md5');
      const sha256Hash = crypto.createHash('sha256');
      const quickHash = crypto.createHash('md5');

      const stream = fs.createReadStream(filePath);
      let bytesRead = 0;
      const quickHashSize = 1024 * 1024; // 1MB pour le quick hash

      stream.on('data', (chunk) => {
        md5Hash.update(chunk);
        sha256Hash.update(chunk);
        
        // Pour le quick hash, seulement les premiers MB
        if (bytesRead < quickHashSize) {
          quickHash.update(chunk);
        }
        bytesRead += chunk.length;
      });

      stream.on('end', () => {
        resolve({
          md5Hash: md5Hash.digest('hex'),
          sha256Hash: sha256Hash.digest('hex'),
          quickHash: quickHash.digest('hex'),
        });
      });

      stream.on('error', reject);
    });
  }

  /**
   * Trouver les doublons d'un fichier
   */
  async findDuplicates(userId, contentHash) {
    try {
      const duplicates = await FileFingerprint.find({
        user_id: userId,
        content_hash: contentHash,
      }).populate('file_id', 'name size mime_type');

      return duplicates;
    } catch (error) {
      console.error('Error finding duplicates:', error);
      throw error;
    }
  }

  /**
   * Vérifier l'intégrité d'un fichier
   */
  async verifyIntegrity(fileId, filePath) {
    try {
      const fingerprint = await FileFingerprint.findOne({ file_id: fileId });
      if (!fingerprint) {
        return { valid: false, reason: 'No fingerprint found' };
      }

      const { sha256Hash } = await this.calculateHashes(filePath);
      
      if (sha256Hash === fingerprint.sha256_hash) {
        fingerprint.verified_at = new Date();
        await fingerprint.save();
        return { valid: true };
      } else {
        return { valid: false, reason: 'Hash mismatch - file may have been modified' };
      }
    } catch (error) {
      console.error('Error verifying integrity:', error);
      return { valid: false, reason: error.message };
    }
  }
}

module.exports = new FingerprintService();


