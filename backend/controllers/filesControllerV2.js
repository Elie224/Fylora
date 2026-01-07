/**
 * Contrôleur de Fichiers V2 - Architecture de Niveau Industrie
 * Utilise Object Storage (S3) avec URLs signées
 * Upload/Download direct depuis le navigateur
 */

const storageService = require('../services/storageService');
const quotaService = require('../services/quotaService');
const fileMetadataService = require('../services/fileMetadataService');
const logger = require('../utils/logger');
const { queues, queueManager } = require('../utils/queue');
const searchEngine = require('../services/searchEngine');

/**
 * Générer une URL signée pour upload
 * POST /api/files/v2/upload-url
 */
async function generateUploadUrl(req, res, next) {
  try {
    const userId = req.user.id;
    const { fileName, fileSize, mimeType, folderId } = req.body;

    if (!fileName || !fileSize || !mimeType) {
      return res.status(400).json({
        error: { message: 'fileName, fileSize, and mimeType are required' }
      });
    }

    // Vérifier le quota
    const quotaCheck = await quotaService.checkQuota(userId, fileSize);
    if (!quotaCheck.hasQuota) {
      return res.status(413).json({
        error: {
          message: 'Insufficient storage quota',
          available: quotaCheck.available,
          required: quotaCheck.required,
          limit: quotaCheck.limit
        }
      });
    }

    // Générer l'URL signée
    const uploadData = await storageService.generateUploadUrl(
      userId,
      fileName,
      fileSize,
      mimeType,
      60 // 1 heure
    );

    // Stocker temporairement les métadonnées pour finalisation
    // (peut être fait dans Redis avec TTL)
    const redisCache = require('../utils/redisCache');
    await redisCache.set(
      `upload:pending:${uploadData.fileKey}`,
      {
        userId,
        fileName,
        fileSize,
        mimeType,
        folderId: folderId || null,
      },
      3600 // 1 heure
    );

    res.status(200).json({
      data: uploadData
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Finaliser l'upload après upload S3 réussi
 * POST /api/files/v2/finalize
 * Body: { fileKey, etag }
 */
async function finalizeUpload(req, res, next) {
  try {
    const userId = req.user.id;
    const { fileKey, etag } = req.body;

    if (!fileKey || !etag) {
      return res.status(400).json({
        error: { message: 'fileKey and etag are required' }
      });
    }

    // Récupérer les métadonnées temporaires
    const redisCache = require('../utils/redisCache');
    const pendingData = await redisCache.get(`upload:pending:${fileKey}`);
    
    if (!pendingData || pendingData.userId !== userId) {
      return res.status(404).json({
        error: { message: 'Upload session not found or expired' }
      });
    }

    // Vérifier que le fichier existe dans S3
    const fileExists = await storageService.fileExists(fileKey);
    if (!fileExists) {
      return res.status(404).json({
        error: { message: 'File not found in storage' }
      });
    }

    // Obtenir les métadonnées S3
    const s3Metadata = await storageService.getFileMetadata(fileKey);

    // Créer l'entrée de métadonnées dans MongoDB
    const file = await fileMetadataService.createFileMetadata({
      name: pendingData.fileName,
      mimeType: pendingData.mimeType,
      size: pendingData.fileSize,
      folderId: pendingData.folderId,
      ownerId: userId,
      fileKey,
      etag,
    });

    // Réserver le quota
    await quotaService.reserveQuota(userId, pendingData.fileSize);

    // Nettoyer les données temporaires
    await redisCache.del(`upload:pending:${fileKey}`);

    // Traitement asynchrone en arrière-plan
    Promise.all([
      // Indexation pour recherche
      searchEngine.indexFileAsync(file.id, userId, fileKey, pendingData.mimeType).catch(err =>
        logger.logError(err, { context: 'search_indexing' })
      ),
      // OCR si nécessaire
      queueManager.addJob('file-processing', {
        fileId: file.id,
        userId,
        fileKey,
        mimeType: pendingData.mimeType,
        fileSize: pendingData.fileSize,
      }).catch(err => {
        // Logger l'erreur mais ne pas faire échouer l'upload
        if (!err.message || !err.message.includes('Connection is closed')) {
          logger.logError(err, { context: 'file_processing_queue' });
        }
      }),
    ]).catch(err => {
      logger.logError(err, { context: 'background_processing' });
    });

    logger.logInfo('Upload finalized', {
      fileId: file.id,
      userId,
      fileKey,
      size: pendingData.fileSize
    });

    res.status(201).json({
      data: file,
      message: 'File uploaded successfully'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Générer une URL signée pour download
 * GET /api/files/v2/:id/download-url
 */
async function generateDownloadUrl(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Obtenir les métadonnées
    const file = await fileMetadataService.getFileMetadata(id, userId);

    // Vérifier que le fichier n'est pas supprimé
    if (file.is_deleted) {
      return res.status(404).json({
        error: { message: 'File has been deleted' }
      });
    }

    // Obtenir la clé S3
    const fileKey = await fileMetadataService.getFileS3Key(id);

    // Vérifier que le fichier existe dans S3
    const exists = await storageService.fileExists(fileKey);
    if (!exists) {
      return res.status(404).json({
        error: { message: 'File not found in storage' }
      });
    }

    // Générer l'URL signée
    const downloadData = await storageService.generateDownloadUrl(
      fileKey,
      file.name,
      15 // 15 minutes
    );

    // Logger l'accès (audit)
    logger.logInfo('Download URL generated', {
      fileId: id,
      userId,
      fileName: file.name
    });

    res.status(200).json({
      data: downloadData
    });
  } catch (err) {
    if (err.message === 'File not found' || err.message === 'Access denied') {
      return res.status(403).json({
        error: { message: err.message }
      });
    }
    next(err);
  }
}

/**
 * Générer une URL signée pour prévisualisation
 * GET /api/files/v2/:id/preview-url
 */
async function generatePreviewUrl(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Obtenir les métadonnées
    const file = await fileMetadataService.getFileMetadata(id, userId);

    if (file.is_deleted) {
      return res.status(404).json({
        error: { message: 'File has been deleted' }
      });
    }

    const fileKey = await fileMetadataService.getFileS3Key(id);
    const exists = await storageService.fileExists(fileKey);
    
    if (!exists) {
      return res.status(404).json({
        error: { message: 'File not found in storage' }
      });
    }

    const previewData = await storageService.generatePreviewUrl(
      fileKey,
      file.mime_type,
      15 // 15 minutes
    );

    res.status(200).json({
      data: previewData
    });
  } catch (err) {
    if (err.message === 'File not found' || err.message === 'Access denied') {
      return res.status(403).json({
        error: { message: err.message }
      });
    }
    next(err);
  }
}

/**
 * Initier un upload multipart (chunké)
 * POST /api/files/v2/multipart/initiate
 */
async function initiateMultipartUpload(req, res, next) {
  try {
    const userId = req.user.id;
    const { fileName, fileSize, mimeType, folderId } = req.body;

    if (!fileName || !fileSize || !mimeType) {
      return res.status(400).json({
        error: { message: 'fileName, fileSize, and mimeType are required' }
      });
    }

    // Vérifier le quota
    const quotaCheck = await quotaService.checkQuota(userId, fileSize);
    if (!quotaCheck.hasQuota) {
      return res.status(413).json({
        error: {
          message: 'Insufficient storage quota',
          available: quotaCheck.available,
          required: quotaCheck.required
        }
      });
    }

    // Initier l'upload multipart
    const multipartData = await storageService.initiateMultipartUpload(
      userId,
      fileName,
      fileSize,
      mimeType
    );

    // Stocker les métadonnées temporaires
    const redisCache = require('../utils/redisCache');
    await redisCache.set(
      `multipart:${multipartData.uploadId}`,
      {
        userId,
        fileName,
        fileSize,
        mimeType,
        folderId: folderId || null,
        fileKey: multipartData.fileKey,
        parts: [],
      },
      3600 // 1 heure
    );

    res.status(200).json({
      data: multipartData
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Générer une URL pour upload d'un chunk
 * POST /api/files/v2/multipart/chunk-url
 */
async function generateChunkUploadUrl(req, res, next) {
  try {
    const { uploadId, partNumber, chunkSize } = req.body;

    if (!uploadId || !partNumber || !chunkSize) {
      return res.status(400).json({
        error: { message: 'uploadId, partNumber, and chunkSize are required' }
      });
    }

    // Récupérer les métadonnées de l'upload
    const redisCache = require('../utils/redisCache');
    const uploadData = await redisCache.get(`multipart:${uploadId}`);
    
    if (!uploadData) {
      return res.status(404).json({
        error: { message: 'Upload session not found or expired' }
      });
    }

    // Générer l'URL pour ce chunk
    const chunkData = await storageService.generateChunkUploadUrl(
      uploadData.fileKey,
      uploadId,
      partNumber,
      chunkSize
    );

    res.status(200).json({
      data: chunkData
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Finaliser un upload multipart
 * POST /api/files/v2/multipart/complete
 */
async function completeMultipartUpload(req, res, next) {
  try {
    const userId = req.user.id;
    const { uploadId, parts } = req.body;

    if (!uploadId || !parts || !Array.isArray(parts)) {
      return res.status(400).json({
        error: { message: 'uploadId and parts array are required' }
      });
    }

    // Récupérer les métadonnées
    const redisCache = require('../utils/redisCache');
    const uploadData = await redisCache.get(`multipart:${uploadId}`);
    
    if (!uploadData || uploadData.userId !== userId) {
      return res.status(404).json({
        error: { message: 'Upload session not found or expired' }
      });
    }

    // Finaliser l'upload multipart dans S3
    const result = await storageService.completeMultipartUpload(
      uploadData.fileKey,
      uploadId,
      parts
    );

    // Obtenir les métadonnées S3
    const s3Metadata = await storageService.getFileMetadata(uploadData.fileKey);

    // Créer l'entrée de métadonnées
    const file = await fileMetadataService.createFileMetadata({
      name: uploadData.fileName,
      mimeType: uploadData.mimeType,
      size: uploadData.fileSize,
      folderId: uploadData.folderId,
      ownerId: userId,
      fileKey: uploadData.fileKey,
      etag: result.etag,
    });

    // Réserver le quota
    await quotaService.reserveQuota(userId, uploadData.fileSize);

    // Nettoyer
    await redisCache.del(`multipart:${uploadId}`);

    // Traitement asynchrone
    Promise.all([
      searchEngine.indexFileAsync(file.id, userId, uploadData.fileKey, uploadData.mimeType).catch(() => {}),
      queueManager.addJob('file-processing', {
        fileId: file.id,
        userId,
        fileKey: uploadData.fileKey,
        mimeType: uploadData.mimeType,
        fileSize: uploadData.fileSize,
      }).catch(() => {}),
    ]).catch(() => {});

    res.status(201).json({
      data: file,
      message: 'File uploaded successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateUploadUrl,
  finalizeUpload,
  generateDownloadUrl,
  generatePreviewUrl,
  initiateMultipartUpload,
  generateChunkUploadUrl,
  completeMultipartUpload,
};

