/**
 * Routes pour Pre-signed URLs
 * Permet aux clients d'uploader/télécharger directement depuis le storage
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const presignedUrlService = require('../services/presignedUrlService');
const { apiLimiter } = require('../middlewares/rateLimiter');
const { timeoutMiddleware } = require('../middlewares/timeoutMiddleware');
const logger = require('../utils/logger');

/**
 * POST /api/presigned/upload
 * Générer une URL pré-signée pour upload
 */
router.post('/upload', 
  apiLimiter,
  timeoutMiddleware(1000), // Timeout court pour génération d'URL
  authMiddleware,
  async (req, res, next) => {
    try {
      const { fileName, mimeType, fileSize } = req.body;
      const userId = req.user.id;

      if (!fileName || !mimeType || !fileSize) {
        return res.status(400).json({
          error: {
            message: 'Missing required fields: fileName, mimeType, fileSize',
          },
        });
      }

      const uploadUrl = await presignedUrlService.generateUploadUrl(
        userId,
        fileName,
        mimeType,
        parseInt(fileSize),
        req.body.options || {}
      );

      logger.logInfo('Pre-signed upload URL generated', {
        userId,
        fileName,
        fileSize,
      });

      res.status(200).json({
        data: uploadUrl,
      });
    } catch (err) {
      logger.logError(err, {
        context: 'presigned_upload_url',
        userId: req.user?.id,
      });
      next(err);
    }
  }
);

/**
 * GET /api/presigned/download/:fileId
 * Générer une URL pré-signée pour download
 */
router.get('/download/:fileId',
  apiLimiter,
  timeoutMiddleware(1000),
  authMiddleware,
  async (req, res, next) => {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;

      const downloadUrl = await presignedUrlService.generateDownloadUrl(
        fileId,
        userId,
        req.query || {}
      );

      logger.logInfo('Pre-signed download URL generated', {
        userId,
        fileId,
      });

      res.status(200).json({
        data: downloadUrl,
      });
    } catch (err) {
      logger.logError(err, {
        context: 'presigned_download_url',
        userId: req.user?.id,
        fileId: req.params.fileId,
      });
      next(err);
    }
  }
);

/**
 * POST /api/files/upload-presigned
 * Endpoint pour upload via URL pré-signée (validation du token)
 */
router.post('/upload-presigned',
  apiLimiter,
  async (req, res, next) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({
          error: {
            message: 'Missing token parameter',
          },
        });
      }

      // Vérifier le token
      const decoded = presignedUrlService.verifyToken(token);
      
      if (decoded.action !== 'upload') {
        return res.status(403).json({
          error: {
            message: 'Invalid token action',
          },
        });
      }

      // Rediriger vers le controller d'upload normal
      // Le token est déjà validé, on peut faire confiance aux données
      req.user = { id: decoded.userId };
      req.body = {
        ...req.body,
        fileName: decoded.fileName,
        mimeType: decoded.mimeType,
        fileSize: decoded.fileSize,
      };

      // Appeler le controller d'upload
      const filesController = require('../controllers/filesController');
      return filesController.uploadFile(req, res, next);
    } catch (err) {
      logger.logError(err, {
        context: 'presigned_upload_validation',
      });
      
      if (err.message.includes('expired') || err.message.includes('Invalid')) {
        return res.status(403).json({
          error: {
            message: 'Invalid or expired token',
          },
        });
      }
      
      next(err);
    }
  }
);

module.exports = router;

