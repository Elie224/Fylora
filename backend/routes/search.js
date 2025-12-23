const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Rechercher
router.get('/', searchController.search);
router.get('/autocomplete', searchController.autocomplete);

module.exports = router;

