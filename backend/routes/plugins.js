const express = require('express');
const router = express.Router();
const pluginsController = require('../controllers/pluginsController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Lister les plugins disponibles
router.get('/available', pluginsController.listPlugins);

// Lister les plugins activés par l'utilisateur
router.get('/', pluginsController.listUserPlugins);

// Activer un plugin
router.post('/enable', pluginsController.enablePlugin);

// Désactiver un plugin
router.post('/:id/disable', pluginsController.disablePlugin);

// Synchroniser avec un plugin
router.post('/:id/sync', pluginsController.syncPlugin);

module.exports = router;


