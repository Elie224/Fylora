const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Lister les activités
router.get('/', activityController.listActivities);

// Obtenir les statistiques
router.get('/stats', activityController.getActivityStats);

// Exporter en CSV
router.get('/export', activityController.exportActivities);

module.exports = router;





