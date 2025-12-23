/**
 * Routes pour batch operations
 */
const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { validateBatch, handleBatchValidation } = require('../middlewares/batchMiddleware');

router.use(authMiddleware);

router.post('/files', validateBatch, handleBatchValidation, batchController.batchFiles);
router.post('/folders', validateBatch, handleBatchValidation, batchController.batchFolders);

module.exports = router;


