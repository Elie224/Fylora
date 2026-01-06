const express = require('express');
const router = express.Router();
const intelligenceController = require('../controllers/intelligenceController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { checkOCR, attachPlanInfo } = require('../middlewares/planMiddleware');

router.use(authMiddleware);

router.get('/files/:id/metadata', intelligenceController.getFileMetadata);
router.post('/files/:id/process', intelligenceController.processFile);
router.get('/encryption-suggestions', intelligenceController.getEncryptionSuggestions);

/**
 * POST /api/intelligence/ocr/:fileId
 * Extraire le texte d'une image avec OCR
 */
router.post('/ocr/:fileId', checkOCR, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { language, detectLanguage } = req.body;
    const userId = req.user.id;

    // Récupérer le fichier
    const file = await FileModel.findById(fileId);
    if (!file) {
      return res.status(404).json({
        error: { message: 'File not found' },
      });
    }

    // Vérifier la propriété
    if (String(file.owner_id) !== String(userId)) {
      return res.status(403).json({
        error: { message: 'Access denied' },
      });
    }

    // Vérifier que c'est une image
    if (!file.mime_type?.startsWith('image/')) {
      return res.status(400).json({
        error: { message: 'OCR is only available for images' },
      });
    }

    // Lire le fichier
    let fileBuffer;
    const storageType = file.storage_type || (file.file_path.startsWith('fylora/') ? 'cloudinary' : 'local');

    if (storageType === 'cloudinary') {
      // Télécharger depuis Cloudinary
      const cloudinaryService = require('../services/cloudinaryService');
      const downloadUrl = cloudinaryService.generateDownloadUrl(file.file_path, file.name);
      const axios = require('axios');
      const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
      fileBuffer = Buffer.from(response.data);
    } else {
      // Lire depuis le stockage local
      let filePath;
      if (path.isAbsolute(file.file_path)) {
        filePath = file.file_path;
      } else {
        filePath = path.resolve(config.upload.uploadDir, file.file_path);
      }
      fileBuffer = await fs.readFile(filePath);

      // Déchiffrer si nécessaire
      const encryptionService = require('../services/encryptionService');
      if (encryptionService.isEnabled()) {
        try {
          fileBuffer = encryptionService.decrypt(fileBuffer, userId);
        } catch (decryptErr) {
          logger.logWarn('File decryption failed, trying without decryption', {
            fileId,
            error: decryptErr.message,
          });
        }
      }
    }

    // Extraire le texte avec OCR
    const result = await ocrService.processFile(fileBuffer, file.mime_type, {
      language: language || 'fra',
      detectLanguage: detectLanguage || false,
    });

    // Indexer le texte dans ElasticSearch pour recherche
    const searchService = require('../services/searchService');
    await searchService.indexFile({
      ...file,
      content: result.text,
    });

    // Publier événement
    const eventBus = require('../services/eventBus');
    eventBus.publish(eventBus.Events.OCR_COMPLETED, {
      fileId,
      fileName: file.name,
      textLength: result.text.length,
      confidence: result.confidence,
      language: result.language,
      userId,
    }).catch(err => {
      logger.logError(err, { context: 'event_publish_ocr_completed' });
    });

    res.json({
      data: {
        text: result.text,
        confidence: result.confidence,
        language: result.language,
        words: result.words,
        paragraphs: result.paragraphs,
      },
      message: 'OCR processing completed',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


