const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/most-opened', statisticsController.getMostOpenedFiles);
router.get('/unused', statisticsController.getUnusedFiles);
router.get('/recent', statisticsController.getRecentFiles);
router.get('/personal', statisticsController.getPersonalStatistics);

module.exports = router;


