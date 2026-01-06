/**
 * Routes pour Upload Multipart
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const multipartService = require('../services/multipartUploadService');
const logger = require('../utils/logger');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

/**
 * POST /api/multipart/initiate
 * Initialiser un upload multipart
 */
router.post('/initiate', async (req, res, next) => {
  try {
    const { fileName, fileSize, mimeType } = req.body;

    if (!fileName || !fileSize || !mimeType) {
      return res.status(400).json({
        error: { message: 'fileName, fileSize, and mimeType are required' },
      });
    }

    const result = await multipartService.initiateUpload(
      fileName,
      parseInt(fileSize),
      mimeType,
      req.user.id
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/multipart/chunk/:uploadId
 * Uploader un chunk
 */
router.post('/chunk/:uploadId', async (req, res, next) => {
  try {
    const { uploadId } = req.params;
    const { chunkIndex, chunkHash } = req.body;

    if (chunkIndex === undefined || !chunkHash) {
      return res.status(400).json({
        error: { message: 'chunkIndex and chunkHash are required' },
      });
    }

    // Récupérer les données du chunk depuis le body
    const chunkData = req.body.chunkData || Buffer.from(req.body.chunk, 'base64');

    const result = await multipartService.uploadChunk(
      uploadId,
      parseInt(chunkIndex),
      chunkData,
      chunkHash
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/multipart/finalize/:uploadId
 * Finaliser l'upload (combiner tous les chunks)
 */
router.post('/finalize/:uploadId', async (req, res, next) => {
  try {
    const { uploadId } = req.params;

    const result = await multipartService.finalizeUpload(uploadId);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/multipart/status/:uploadId
 * Obtenir le statut d'un upload
 */
router.get('/status/:uploadId', async (req, res, next) => {
  try {
    const { uploadId } = req.params;

    const status = await multipartService.getUploadStatus(uploadId);

    if (!status) {
      return res.status(404).json({
        error: { message: 'Upload not found' },
      });
    }

    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/multipart/cancel/:uploadId
 * Annuler un upload
 */
router.delete('/cancel/:uploadId', async (req, res, next) => {
  try {
    const { uploadId } = req.params;

    const result = await multipartService.cancelUpload(uploadId);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

