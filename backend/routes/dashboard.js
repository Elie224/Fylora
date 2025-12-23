const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { cacheMiddleware } = require('../utils/cache');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Obtenir les statistiques du dashboard avec cache (30 secondes)
router.get('/', cacheMiddleware(30000), dashboardController.getDashboard);

module.exports = router;

