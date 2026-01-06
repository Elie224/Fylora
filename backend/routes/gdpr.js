/**
 * Routes RGPD / GDPR
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const gdprController = require('../controllers/gdprController');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Exporter les données utilisateur
router.get('/export', gdprController.exportData);

// Supprimer toutes les données utilisateur
router.delete('/delete', gdprController.deleteData);

module.exports = router;
