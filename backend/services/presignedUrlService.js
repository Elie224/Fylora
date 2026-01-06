/**
 * Service Pre-signed URLs pour décharger le backend
 * Permet aux clients d'uploader/télécharger directement depuis le storage
 * sans passer par l'API
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const cloudinaryService = require('./cloudinaryService');

class PresignedUrlService {
  constructor() {
    this.urlExpiration = 3600; // 1 heure par défaut
    this.maxFileSize = 100 * 1024 * 1024; // 100 MB max pour pre-signed
  }

  /**
   * Générer une URL pré-signée pour upload
   * @param {string} userId - ID de l'utilisateur
   * @param {string} fileName - Nom du fichier
   * @param {string} mimeType - Type MIME
   * @param {number} fileSize - Taille du fichier
   * @param {object} options - Options supplémentaires
   * @returns {Promise<object>} URL pré-signée et métadonnées
   */
  async generateUploadUrl(userId, fileName, mimeType, fileSize, options = {}) {
    try {
      // Vérifier la taille
      if (fileSize > this.maxFileSize) {
        throw new Error(`File size exceeds maximum allowed size: ${this.maxFileSize} bytes`);
      }

      // Si Cloudinary est configuré, utiliser leur système de signature
      if (cloudinaryService && cloudinaryService.isCloudinaryConfigured()) {
        return await this._generateCloudinaryUploadUrl(userId, fileName, mimeType, fileSize, options);
      }

      // Sinon, générer une URL signée pour notre API
      return await this._generateApiUploadUrl(userId, fileName, mimeType, fileSize, options);
    } catch (err) {
      logger.logError(err, {
        context: 'presigned_upload_url',
        userId,
        fileName,
      });
      throw err;
    }
  }

  /**
   * Générer une URL pré-signée pour download
   * @param {string} fileId - ID du fichier
   * @param {string} userId - ID de l'utilisateur (pour vérification des droits)
   * @param {object} options - Options (expiration, disposition, etc.)
   * @returns {Promise<object>} URL pré-signée
   */
  async generateDownloadUrl(fileId, userId, options = {}) {
    try {
      // Si Cloudinary est configuré
      if (cloudinaryService && cloudinaryService.isCloudinaryConfigured()) {
        return await this._generateCloudinaryDownloadUrl(fileId, userId, options);
      }

      // Sinon, URL signée pour notre API
      return await this._generateApiDownloadUrl(fileId, userId, options);
    } catch (err) {
      logger.logError(err, {
        context: 'presigned_download_url',
        fileId,
        userId,
      });
      throw err;
    }
  }

  /**
   * Générer une URL pré-signée Cloudinary pour upload
   */
  async _generateCloudinaryUploadUrl(userId, fileName, mimeType, fileSize, options) {
    const cloudinary = require('cloudinary').v2;
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `fylora/user_${userId}`;
    
    // Signature Cloudinary
    const params = {
      timestamp,
      folder,
      resource_type: mimeType.startsWith('video/') ? 'video' : 'auto',
      allowed_formats: ['jpg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'mp4', 'mov'],
    };

    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
    
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${params.resource_type}/upload`,
      signature,
      timestamp,
      folder,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      expiresAt: new Date(Date.now() + (this.urlExpiration * 1000)).toISOString(),
    };
  }

  /**
   * Générer une URL signée pour upload via notre API
   */
  async _generateApiUploadUrl(userId, fileName, mimeType, fileSize, options) {
    const token = this._generateSecureToken({
      userId,
      fileName,
      mimeType,
      fileSize,
      action: 'upload',
      expiresAt: Date.now() + (this.urlExpiration * 1000),
    });

    const apiUrl = process.env.API_URL || 'http://localhost:5001';
    return {
      uploadUrl: `${apiUrl}/api/files/upload-presigned`,
      token,
      expiresAt: new Date(Date.now() + (this.urlExpiration * 1000)).toISOString(),
    };
  }

  /**
   * Générer une URL pré-signée Cloudinary pour download
   */
  async _generateCloudinaryDownloadUrl(fileId, userId, options) {
    // Récupérer les métadonnées du fichier depuis la DB
    const FileModel = require('../models/fileModel');
    const file = await FileModel.findById(fileId);
    
    if (!file || file.owner_id.toString() !== userId) {
      throw new Error('File not found or access denied');
    }

    if (file.storage_type !== 'cloudinary') {
      throw new Error('File is not stored in Cloudinary');
    }

    // Générer URL signée Cloudinary
    const cloudinary = require('cloudinary').v2;
    const url = cloudinary.url(file.file_path, {
      secure: true,
      sign_url: true,
      expires_at: Math.round(Date.now() / 1000) + this.urlExpiration,
      ...options,
    });

    return {
      downloadUrl: url,
      expiresAt: new Date(Date.now() + (this.urlExpiration * 1000)).toISOString(),
    };
  }

  /**
   * Générer une URL signée pour download via notre API
   */
  async _generateApiDownloadUrl(fileId, userId, options) {
    const token = this._generateSecureToken({
      fileId,
      userId,
      action: 'download',
      expiresAt: Date.now() + (this.urlExpiration * 1000),
    });

    const apiUrl = process.env.API_URL || 'http://localhost:5001';
    return {
      downloadUrl: `${apiUrl}/api/files/${fileId}/download-presigned?token=${token}`,
      expiresAt: new Date(Date.now() + (this.urlExpiration * 1000)).toISOString(),
    };
  }

  /**
   * Vérifier et valider un token pré-signé
   */
  verifyToken(token) {
    try {
      const secret = process.env.PRESIGNED_URL_SECRET || process.env.JWT_SECRET || 'default-secret-change-in-production';
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      const signature = decoded.signature;
      delete decoded.signature;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(decoded))
        .digest('hex');

      if (signature !== expectedSignature) {
        throw new Error('Invalid signature');
      }

      if (decoded.expiresAt < Date.now()) {
        throw new Error('Token expired');
      }

      return decoded;
    } catch (err) {
      logger.logError(err, { context: 'presigned_token_verification' });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Générer un token sécurisé
   */
  _generateSecureToken(data) {
    const secret = process.env.PRESIGNED_URL_SECRET || process.env.JWT_SECRET || 'default-secret-change-in-production';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(data))
      .digest('hex');

    const payload = { ...data, signature };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
}

module.exports = new PresignedUrlService();

