const express = require('express');
const router = express.Router();
const cleanupController = require('../controllers/cleanupController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/analyze', cleanupController.analyzeCleanup);
router.get('/recommendations', cleanupController.getCleanupRecommendations);
router.post('/recommendations/:id/apply', cleanupController.applyRecommendation);
router.post('/recommendations/:id/ignore', cleanupController.ignoreRecommendation);

module.exports = router;


