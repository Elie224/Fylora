/**
 * Routes pour le stockage Object (S3)
 * Upload/Download direct avec URLs signées
 */

const express = require('express');
const router = express.Router();
const storageService = require('../services/storageService');
const quotaService = require('../services/quotaService');
const { authMiddleware } = require('../middlewares/authMiddleware');
const logger = require('../utils/logger');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * Générer une URL signée pour upload
 * POST /api/storage/upload-url
 * Body: { fileName, fileSize, mimeType, folderId? }
 */
router.post('/upload-url', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileName, fileSize, mimeType, folderId } = req.body;

    if (!fileName || !fileSize || !mimeType) {
      return res.status(400).json({
        error: { message: 'fileName, fileSize, and mimeType are required' }
      });
    }

    // Vérifier le quota AVANT de générer l'URL
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
      60 // 1 heure d'expiration
    );

    logger.logInfo('Upload URL generated', {
      userId,
      fileName,
      fileSize,
      fileKey: uploadData.fileKey
    });

    res.status(200).json({
      data: uploadData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Générer une URL signée pour download
 * GET /api/storage/download-url/:fileKey
 * Query: { fileName }
 */
router.get('/download-url/:fileKey', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileKey } = req.params;
    const { fileName } = req.query;

    if (!fileName) {
      return res.status(400).json({
        error: { message: 'fileName query parameter is required' }
      });
    }

    // Vérifier les permissions (doit être fait par le service de fichiers)
    // Ici on génère juste l'URL

    const downloadData = await storageService.generateDownloadUrl(
      fileKey,
      fileName,
      15 // 15 minutes d'expiration
    );

    res.status(200).json({
      data: downloadData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Générer une URL signée pour prévisualisation
 * GET /api/storage/preview-url/:fileKey
 * Query: { mimeType }
 */
router.get('/preview-url/:fileKey', async (req, res, next) => {
  try {
    const { fileKey } = req.params;
    const { mimeType } = req.query;

    if (!mimeType) {
      return res.status(400).json({
        error: { message: 'mimeType query parameter is required' }
      });
    }

    const previewData = await storageService.generatePreviewUrl(
      fileKey,
      mimeType,
      15 // 15 minutes d'expiration
    );

    res.status(200).json({
      data: previewData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Initier un upload multipart (chunké)
 * POST /api/storage/multipart/initiate
 * Body: { fileName, fileSize, mimeType }
 */
router.post('/multipart/initiate', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileName, fileSize, mimeType } = req.body;

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

    const multipartData = await storageService.initiateMultipartUpload(
      userId,
      fileName,
      fileSize,
      mimeType
    );

    res.status(200).json({
      data: multipartData
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Générer une URL pour upload d'un chunk
 * POST /api/storage/multipart/chunk-url
 * Body: { fileKey, uploadId, partNumber, chunkSize }
 */
router.post('/multipart/chunk-url', async (req, res, next) => {
  try {
    const { fileKey, uploadId, partNumber, chunkSize } = req.body;

    if (!fileKey || !uploadId || !partNumber || !chunkSize) {
      return res.status(400).json({
        error: { message: 'fileKey, uploadId, partNumber, and chunkSize are required' }
      });
    }

    const chunkData = await storageService.generateChunkUploadUrl(
      fileKey,
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
});

/**
 * Finaliser un upload multipart
 * POST /api/storage/multipart/complete
 * Body: { fileKey, uploadId, parts: [{ etag, partNumber }] }
 */
router.post('/multipart/complete', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileKey, uploadId, parts } = req.body;

    if (!fileKey || !uploadId || !parts || !Array.isArray(parts)) {
      return res.status(400).json({
        error: { message: 'fileKey, uploadId, and parts array are required' }
      });
    }

    const result = await storageService.completeMultipartUpload(
      fileKey,
      uploadId,
      parts
    );

    // Obtenir les métadonnées du fichier
    const metadata = await storageService.getFileMetadata(fileKey);

    logger.logInfo('Multipart upload completed', {
      userId,
      fileKey,
      uploadId,
      size: metadata.size
    });

    res.status(200).json({
      data: {
        ...result,
        metadata
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Annuler un upload multipart
 * POST /api/storage/multipart/abort
 * Body: { fileKey, uploadId }
 */
router.post('/multipart/abort', async (req, res, next) => {
  try {
    const { fileKey, uploadId } = req.body;

    if (!fileKey || !uploadId) {
      return res.status(400).json({
        error: { message: 'fileKey and uploadId are required' }
      });
    }

    await storageService.abortMultipartUpload(fileKey, uploadId);

    res.status(200).json({
      message: 'Multipart upload aborted'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Vérifier si le storage est configuré
 * GET /api/storage/status
 */
router.get('/status', (req, res) => {
  res.status(200).json({
    data: {
      configured: storageService.isStorageConfigured(),
      type: storageService.getStorageType(),
      bucket: storageService.bucketName
    }
  });
});

module.exports = router;

