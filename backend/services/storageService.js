/**
 * Service de stockage abstrait pour gérer les fichiers
 * Supporte le stockage local et S3 (AWS S3, DigitalOcean Spaces, etc.)
 */
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local'; // 'local' ou 's3'
    this.isS3Enabled = this.storageType === 's3';
    
    if (this.isS3Enabled) {
      this.initS3();
    }
  }

  /**
   * Initialiser S3 si configuré
   */
  initS3() {
    try {
      const AWS = require('aws-sdk');
      
      this.s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
        endpoint: process.env.AWS_ENDPOINT, // Pour DigitalOcean Spaces ou autres
        s3ForcePathStyle: process.env.AWS_S3_FORCE_PATH_STYLE === 'true',
      });
      
      this.s3Bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET;
      
      if (!this.s3Bucket) {
        logger.logWarn('S3 bucket not configured, falling back to local storage');
        this.storageType = 'local';
        this.isS3Enabled = false;
      } else {
        logger.logInfo('S3 storage initialized', { bucket: this.s3Bucket });
      }
    } catch (err) {
      logger.logError('Failed to initialize S3, falling back to local storage', {
        error: err.message
      });
      this.storageType = 'local';
      this.isS3Enabled = false;
    }
  }

  /**
   * Générer la clé S3 pour un fichier
   */
  getS3Key(filePath, userId) {
    // Normaliser le chemin pour S3
    const normalizedPath = filePath.replace(/\\/g, '/');
    // Si c'est un chemin absolu, extraire la partie relative
    if (path.isAbsolute(normalizedPath)) {
      const uploadDir = path.resolve(config.upload.uploadDir).replace(/\\/g, '/');
      return normalizedPath.replace(uploadDir + '/', '');
    }
    return normalizedPath;
  }

  /**
   * Sauvegarder un fichier
   */
  async saveFile(sourcePath, destinationPath, userId) {
    if (this.isS3Enabled) {
      return this.saveFileToS3(sourcePath, destinationPath, userId);
    } else {
      return this.saveFileLocal(sourcePath, destinationPath, userId);
    }
  }

  /**
   * Sauvegarder un fichier localement
   */
  async saveFileLocal(sourcePath, destinationPath, userId) {
    try {
      // Créer le répertoire de destination s'il n'existe pas
      const destDir = path.dirname(destinationPath);
      await fs.mkdir(destDir, { recursive: true });
      
      // Copier le fichier
      await fs.copyFile(sourcePath, destinationPath);
      
      // Vérifier que le fichier existe
      await fs.access(destinationPath);
      
      return {
        success: true,
        path: destinationPath,
        storageType: 'local'
      };
    } catch (err) {
      logger.logError('Error saving file locally', {
        sourcePath,
        destinationPath,
        error: err.message,
        userId
      });
      throw err;
    }
  }

  /**
   * Sauvegarder un fichier sur S3
   */
  async saveFileToS3(sourcePath, destinationPath, userId) {
    try {
      const fileContent = await fs.readFile(sourcePath);
      const s3Key = this.getS3Key(destinationPath, userId);
      
      const params = {
        Bucket: this.s3Bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: this.getContentType(sourcePath),
        Metadata: {
          userId: userId.toString(),
          uploadedAt: new Date().toISOString()
        }
      };

      const result = await this.s3.upload(params).promise();
      
      logger.logInfo('File saved to S3', {
        s3Key,
        location: result.Location,
        userId
      });

      return {
        success: true,
        path: s3Key,
        storageType: 's3',
        s3Location: result.Location,
        s3Key: s3Key
      };
    } catch (err) {
      logger.logError('Error saving file to S3', {
        sourcePath,
        destinationPath,
        error: err.message,
        userId
      });
      throw err;
    }
  }

  /**
   * Vérifier qu'un fichier existe
   */
  async fileExists(filePath, userId) {
    if (this.isS3Enabled) {
      return this.fileExistsS3(filePath, userId);
    } else {
      return this.fileExistsLocal(filePath);
    }
  }

  /**
   * Vérifier qu'un fichier existe localement
   */
  async fileExistsLocal(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Vérifier qu'un fichier existe sur S3
   */
  async fileExistsS3(filePath, userId) {
    try {
      const s3Key = this.getS3Key(filePath, userId);
      await this.s3.headObject({
        Bucket: this.s3Bucket,
        Key: s3Key
      }).promise();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Supprimer un fichier
   */
  async deleteFile(filePath, userId) {
    if (this.isS3Enabled) {
      return this.deleteFileFromS3(filePath, userId);
    } else {
      return this.deleteFileLocal(filePath);
    }
  }

  /**
   * Supprimer un fichier localement
   */
  async deleteFileLocal(filePath) {
    try {
      await fs.unlink(filePath);
      return { success: true };
    } catch (err) {
      logger.logWarn('Error deleting local file', {
        filePath,
        error: err.message
      });
      return { success: false, error: err.message };
    }
  }

  /**
   * Supprimer un fichier de S3
   */
  async deleteFileFromS3(filePath, userId) {
    try {
      const s3Key = this.getS3Key(filePath, userId);
      await this.s3.deleteObject({
        Bucket: this.s3Bucket,
        Key: s3Key
      }).promise();
      
      return { success: true };
    } catch (err) {
      logger.logWarn('Error deleting S3 file', {
        filePath,
        s3Key: this.getS3Key(filePath, userId),
        error: err.message
      });
      return { success: false, error: err.message };
    }
  }

  /**
   * Obtenir un stream de fichier pour lecture
   */
  async getFileStream(filePath, userId) {
    if (this.isS3Enabled) {
      return this.getFileStreamFromS3(filePath, userId);
    } else {
      return this.getFileStreamLocal(filePath);
    }
  }

  /**
   * Obtenir un stream de fichier local
   */
  async getFileStreamLocal(filePath) {
    const fs = require('fs');
    return fs.createReadStream(filePath);
  }

  /**
   * Obtenir un stream de fichier depuis S3
   */
  async getFileStreamFromS3(filePath, userId) {
    const s3Key = this.getS3Key(filePath, userId);
    return this.s3.getObject({
      Bucket: this.s3Bucket,
      Key: s3Key
    }).createReadStream();
  }

  /**
   * Obtenir l'URL de prévisualisation/téléchargement
   */
  getFileUrl(filePath, userId, expiresIn = 3600) {
    if (this.isS3Enabled) {
      return this.getS3SignedUrl(filePath, userId, expiresIn);
    } else {
      // Pour le stockage local, retourner le chemin relatif
      return filePath;
    }
  }

  /**
   * Obtenir une URL signée S3
   */
  getS3SignedUrl(filePath, userId, expiresIn) {
    const s3Key = this.getS3Key(filePath, userId);
    return this.s3.getSignedUrl('getObject', {
      Bucket: this.s3Bucket,
      Key: s3Key,
      Expires: expiresIn
    });
  }

  /**
   * Détecter le type MIME d'un fichier
   */
  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Obtenir le type de stockage actuel
   */
  getStorageType() {
    return this.storageType;
  }

  /**
   * Vérifier si S3 est activé
   */
  isS3Storage() {
    return this.isS3Enabled;
  }
}

module.exports = new StorageService();

