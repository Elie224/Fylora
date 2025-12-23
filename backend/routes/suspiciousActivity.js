const express = require('express');
const router = express.Router();
const suspiciousActivityController = require('../controllers/suspiciousActivityController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', suspiciousActivityController.getSuspiciousActivities);
router.post('/:id/resolve', suspiciousActivityController.resolveActivity);

module.exports = router;


