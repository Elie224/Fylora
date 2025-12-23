const express = require('express');
const router = express.Router();
const scheduledBackupController = require('../controllers/scheduledBackupController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Créer une sauvegarde programmée
router.post('/', scheduledBackupController.createScheduledBackup);

// Lister les sauvegardes programmées
router.get('/', scheduledBackupController.listScheduledBackups);

// Exécuter une sauvegarde manuellement
router.post('/:id/run', scheduledBackupController.runBackup);

// Mettre à jour une sauvegarde programmée
router.patch('/:id', scheduledBackupController.updateScheduledBackup);

// Supprimer une sauvegarde programmée
router.delete('/:id', scheduledBackupController.deleteScheduledBackup);

module.exports = router;


