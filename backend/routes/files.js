const express = require('express');
const router = express.Router();
const filesController = require('../controllers/filesController');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/authMiddleware');
const { validateObjectId, validateFilePath } = require('../middlewares/security');
const { validateFileUpload } = require('../middlewares/fileValidation');
const { uploadLimiter, generalLimiter } = require('../middlewares/rateLimiter');

// Télécharger un fichier (peut être public avec token de partage - DOIT être avant authMiddleware)
router.get('/:id/download', optionalAuthMiddleware, filesController.downloadFile);

// Routes protégées (toutes les autres routes nécessitent une authentification)
router.use(authMiddleware);
router.use(generalLimiter); // Rate limiting pour toutes les routes fichiers
router.use(validateObjectId); // Valider tous les ObjectIds dans les paramètres

// Lister les fichiers
router.get('/', filesController.listFiles);

// Uploader un fichier (avec rate limiting et validation)
router.post('/upload', uploadLimiter, filesController.uploadMiddleware, validateFilePath, validateFileUpload, filesController.uploadFile);

// Lister les fichiers supprimés (corbeille) - DOIT être avant les autres routes /:id
router.get('/trash', filesController.listTrash);

// Prévisualiser un fichier
router.get('/:id/preview', filesController.previewFile);

// Stream audio/vidéo
router.get('/:id/stream', filesController.streamFile);

// Mettre à jour un fichier (rename/move)
router.patch('/:id', filesController.updateFile);

// Mettre à jour le contenu d'un fichier texte
router.put('/:id', filesController.uploadMiddleware, filesController.updateFileContent);

// Supprimer un fichier
router.delete('/:id', filesController.deleteFile);

// Restaurer un fichier
router.post('/:id/restore', filesController.restoreFile);

// Supprimer définitivement un fichier
router.delete('/:id/permanent', filesController.permanentDeleteFile);

// Téléchargement en lot (ZIP)
const batchDownloadController = require('../controllers/batchDownloadController');
router.post('/download-batch', batchDownloadController.downloadBatch);

module.exports = router;

