const express = require('express');
const router = express.Router();
const fingerprintController = require('../controllers/fingerprintController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/files/:id', fingerprintController.createFingerprint);
router.get('/files/:id', fingerprintController.getFingerprint);
router.get('/files/:id/duplicates', fingerprintController.findDuplicates);
router.get('/files/:id/verify', fingerprintController.verifyIntegrity);

module.exports = router;


