const express = require('express');
const router = express.Router();
const filesController = require('../controllers/filesController');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/authMiddleware');
const { validateObjectId, validateFilePath } = require('../middlewares/security');
const { validateFileUpload } = require('../middlewares/fileValidation');
const { uploadLimiter, generalLimiter } = require('../middlewares/rateLimiter');

// Télécharger un fichier (peut être public avec token de partage - DOIT être avant authMiddleware)
router.get('/:id/download', optionalAuthMiddleware, filesController.downloadFile);

// Servir un fichier publiquement avec token temporaire (DOIT être avant authMiddleware)
// Gérer les requêtes OPTIONS pour CORS
router.options('/public/:token', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});
router.get('/public/:token', filesController.servePublicPreview);

// Routes protégées (toutes les autres routes nécessitent une authentification)
router.use(authMiddleware);
router.use(generalLimiter); // Rate limiting pour toutes les routes fichiers
// Note: validateObjectId est appliqué individuellement aux routes qui en ont besoin

// Lister les fichiers
router.get('/', filesController.listFiles);

// Uploader un fichier (avec rate limiting et validation)
const { checkFileSizeLimit, attachPlanInfo } = require('../middlewares/planMiddleware');
router.post('/upload', uploadLimiter, attachPlanInfo, checkFileSizeLimit, filesController.uploadMiddleware, validateFilePath, validateFileUpload, filesController.uploadFile);

// Lister les fichiers supprimés (corbeille) - DOIT être avant les autres routes /:id
router.get('/trash', filesController.listTrash);

// Prévisualiser un fichier
router.get('/:id/preview', validateObjectId, filesController.previewFile);

// Générer une URL publique temporaire pour les viewers externes
router.get('/:id/public-preview-url', validateObjectId, filesController.generatePublicPreviewUrl);

// Stream audio/vidéo
router.get('/:id/stream', validateObjectId, filesController.streamFile);

// Mettre à jour un fichier (rename/move)
router.patch('/:id', validateObjectId, filesController.updateFile);

// Mettre à jour le contenu d'un fichier texte
router.put('/:id', validateObjectId, filesController.uploadMiddleware, filesController.updateFileContent);

// Supprimer un fichier
router.delete('/:id', validateObjectId, filesController.deleteFile);

// Restaurer un fichier
router.post('/:id/restore', validateObjectId, filesController.restoreFile);

// Supprimer définitivement un fichier
router.delete('/:id/permanent', validateObjectId, filesController.permanentDeleteFile);

// Téléchargement en lot (ZIP)
const batchDownloadController = require('../controllers/batchDownloadController');
router.post('/download-batch', batchDownloadController.downloadBatch);

module.exports = router;

