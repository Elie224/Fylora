const express = require('express');
const router = express.Router();
const fileValidationController = require('../controllers/fileValidationController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/files/:id/validation', fileValidationController.createValidation);
router.get('/files/:id/validation', fileValidationController.getValidation);
router.get('/validations', fileValidationController.getValidationsByStatus);

module.exports = router;


