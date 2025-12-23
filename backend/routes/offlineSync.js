const express = require('express');
const router = express.Router();
const offlineSyncController = require('../controllers/offlineSyncController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Ajouter une action à la file de synchronisation
router.post('/actions', offlineSyncController.addSyncAction);

// Lister les actions en attente
router.get('/pending', offlineSyncController.listPendingSyncs);

// Obtenir les statistiques de synchronisation
router.get('/stats', offlineSyncController.getSyncStats);

// Marquer une action comme synchronisée
router.post('/:id/synced', offlineSyncController.markSynced);

// Marquer une action comme échouée
router.post('/:id/failed', offlineSyncController.markFailed);

module.exports = router;


