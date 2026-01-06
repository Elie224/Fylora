/**
 * Service d'Upload Multipart Parallèle
 * Permet l'upload de gros fichiers avec résume et parallélisme
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const cloudinaryService = require('./cloudinaryService');
const redisCache = require('../utils/redisCache');

class MultipartUploadService {
  constructor() {
    this.chunkSize = 5 * 1024 * 1024; // 5 MB par chunk
    this.maxConcurrentChunks = 3; // Uploader 3 chunks en parallèle
  }

  /**
   * Initialiser un upload multipart
   */
  async initiateUpload(fileName, fileSize, mimeType, userId) {
    const uploadId = `upload_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    // Calculer le nombre de chunks
    const totalChunks = Math.ceil(fileSize / this.chunkSize);
    
    // Stocker les métadonnées de l'upload
    const uploadMetadata = {
      uploadId,
      fileName,
      fileSize,
      mimeType,
      userId,
      totalChunks,
      uploadedChunks: [],
      status: 'initiated',
      createdAt: new Date().toISOString(),
    };

    // Stocker dans Redis (expire après 24h)
    await redisCache.set(
      `multipart:${uploadId}`,
      uploadMetadata,
      86400
    );

    logger.logInfo('Multipart upload initiated', {
      uploadId,
      fileName,
      fileSize,
      totalChunks,
      userId,
    });

    return {
      uploadId,
      chunkSize: this.chunkSize,
      totalChunks,
    };
  }

  /**
   * Uploader un chunk
   */
  async uploadChunk(uploadId, chunkIndex, chunkData, chunkHash) {
    try {
      // Récupérer les métadonnées
      const metadata = await redisCache.get(`multipart:${uploadId}`);
      if (!metadata) {
        throw new Error('Upload session not found');
      }

      // Vérifier le hash du chunk (intégrité)
      const calculatedHash = crypto
        .createHash('sha256')
        .update(chunkData)
        .digest('hex');

      if (calculatedHash !== chunkHash) {
        throw new Error('Chunk hash mismatch');
      }

      // Stocker le chunk temporairement (dans Redis ou S3)
      const chunkKey = `chunk:${uploadId}:${chunkIndex}`;
      
      // Pour Cloudinary, on stocke en mémoire puis on combine
      // Pour S3, on utilise multipart upload natif
      await redisCache.set(
        chunkKey,
        chunkData.toString('base64'),
        86400 // 24h
      );

      // Marquer le chunk comme uploadé
      metadata.uploadedChunks.push({
        index: chunkIndex,
        hash: chunkHash,
        uploadedAt: new Date().toISOString(),
      });

      await redisCache.set(`multipart:${uploadId}`, metadata, 86400);

      logger.logInfo('Chunk uploaded', {
        uploadId,
        chunkIndex,
        totalChunks: metadata.totalChunks,
        uploadedCount: metadata.uploadedChunks.length,
      });

      return {
        success: true,
        chunkIndex,
        uploadedChunks: metadata.uploadedChunks.length,
        totalChunks: metadata.totalChunks,
      };
    } catch (err) {
      logger.logError(err, {
        context: 'multipart_chunk_upload',
        uploadId,
        chunkIndex,
      });
      throw err;
    }
  }

  /**
   * Finaliser l'upload (combiner tous les chunks)
   */
  async finalizeUpload(uploadId) {
    try {
      const metadata = await redisCache.get(`multipart:${uploadId}`);
      if (!metadata) {
        throw new Error('Upload session not found');
      }

      // Vérifier que tous les chunks sont uploadés
      if (metadata.uploadedChunks.length !== metadata.totalChunks) {
        throw new Error(`Missing chunks: ${metadata.totalChunks - metadata.uploadedChunks.length} remaining`);
      }

      // Trier les chunks par index
      metadata.uploadedChunks.sort((a, b) => a.index - b.index);

      // Récupérer et combiner tous les chunks
      const chunks = [];
      for (const chunkInfo of metadata.uploadedChunks) {
        const chunkKey = `chunk:${uploadId}:${chunkInfo.index}`;
        const chunkData = await redisCache.get(chunkKey);
        
        if (!chunkData) {
          throw new Error(`Chunk ${chunkInfo.index} not found`);
        }

        chunks.push(Buffer.from(chunkData, 'base64'));
      }

      // Combiner tous les chunks
      const completeFile = Buffer.concat(chunks);

      // Vérifier la taille finale
      if (completeFile.length !== metadata.fileSize) {
        throw new Error('File size mismatch');
      }

      // Uploader le fichier complet vers Cloudinary
      const cloudinaryResult = await cloudinaryService.uploadFile(
        completeFile,
        metadata.fileName,
        metadata.userId,
        metadata.mimeType
      );

      // Nettoyer les chunks temporaires
      for (const chunkInfo of metadata.uploadedChunks) {
        const chunkKey = `chunk:${uploadId}:${chunkInfo.index}`;
        await redisCache.del(chunkKey);
      }

      // Marquer l'upload comme complété
      metadata.status = 'completed';
      metadata.completedAt = new Date().toISOString();
      metadata.fileKey = cloudinaryResult.fileKey;
      
      await redisCache.set(`multipart:${uploadId}`, metadata, 3600); // Garder 1h pour référence

      logger.logInfo('Multipart upload finalized', {
        uploadId,
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        fileKey: cloudinaryResult.fileKey,
      });

      return {
        success: true,
        fileKey: cloudinaryResult.fileKey,
        size: cloudinaryResult.size,
        url: cloudinaryResult.url,
      };
    } catch (err) {
      logger.logError(err, {
        context: 'multipart_finalize',
        uploadId,
      });
      throw err;
    }
  }

  /**
   * Obtenir le statut d'un upload
   */
  async getUploadStatus(uploadId) {
    const metadata = await redisCache.get(`multipart:${uploadId}`);
    if (!metadata) {
      return null;
    }

    return {
      uploadId,
      fileName: metadata.fileName,
      fileSize: metadata.fileSize,
      totalChunks: metadata.totalChunks,
      uploadedChunks: metadata.uploadedChunks.length,
      progress: (metadata.uploadedChunks.length / metadata.totalChunks) * 100,
      status: metadata.status,
    };
  }

  /**
   * Annuler un upload
   */
  async cancelUpload(uploadId) {
    const metadata = await redisCache.get(`multipart:${uploadId}`);
    if (!metadata) {
      return { success: false, message: 'Upload not found' };
    }

    // Supprimer tous les chunks
    for (const chunkInfo of metadata.uploadedChunks) {
      const chunkKey = `chunk:${uploadId}:${chunkInfo.index}`;
      await redisCache.del(chunkKey);
    }

    // Supprimer les métadonnées
    await redisCache.del(`multipart:${uploadId}`);

    logger.logInfo('Multipart upload cancelled', { uploadId });

    return { success: true };
  }
}

module.exports = new MultipartUploadService();

