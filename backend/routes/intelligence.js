const express = require('express');
const router = express.Router();
const intelligenceController = require('../controllers/intelligenceController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { checkOCR, attachPlanInfo } = require('../middlewares/planMiddleware');

router.use(authMiddleware);

router.get('/files/:id/metadata', intelligenceController.getFileMetadata);
router.post('/files/:id/process', intelligenceController.processFile);
router.get('/encryption-suggestions', intelligenceController.getEncryptionSuggestions);

module.exports = router;


