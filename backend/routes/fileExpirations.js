const express = require('express');
const router = express.Router();
const fileExpirationController = require('../controllers/fileExpirationController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/files/:id/expiration', fileExpirationController.createExpiration);
router.get('/files/:id/expiration', fileExpirationController.getExpiration);
router.delete('/files/:id/expiration', fileExpirationController.deleteExpiration);
router.get('/expired', fileExpirationController.getExpiredFiles);

module.exports = router;


