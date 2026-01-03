const express = require('express');
const router = express.Router();
const notesController = require('../controllers/notesController');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/authMiddleware');
const { cacheMiddleware } = require('../utils/cache');

// Route publique pour les notes publiques
router.get('/public/:token', optionalAuthMiddleware, notesController.getPublicNote);

// Toutes les autres routes nécessitent une authentification
router.use(authMiddleware);

// Créer une note
router.post('/', notesController.createNote);

// Lister les notes avec cache (15 secondes)
router.get('/', cacheMiddleware(15000), notesController.listNotes);

// Obtenir une note spécifique
router.get('/:id', notesController.getNote);

// Mettre à jour une note
router.patch('/:id', notesController.updateNote);

// Supprimer une note (corbeille)
router.delete('/:id', notesController.deleteNote);

// Restaurer une note
router.post('/:id/restore', notesController.restoreNote);

// Supprimer définitivement une note
router.delete('/:id/permanent', notesController.permanentDeleteNote);

// Partager une note
router.post('/:id/share', notesController.shareNote);

// Retirer le partage
router.post('/:id/unshare', notesController.unshareNote);

// Créer un lien public
router.post('/:id/public-link', notesController.createPublicLink);

// Basculer le statut favori
router.post('/:id/favorite', notesController.toggleFavorite);

// Exporter une note
router.get('/:id/export', notesController.exportNote);

// Routes pour les versions
const noteVersionsController = require('../controllers/noteVersionsController');
router.post('/:note_id/versions', noteVersionsController.createVersion);
router.get('/:note_id/versions', noteVersionsController.listVersions);
router.post('/:note_id/versions/:version_id/restore', noteVersionsController.restoreVersion);
router.get('/:note_id/versions/compare', noteVersionsController.compareVersions);

module.exports = router;

