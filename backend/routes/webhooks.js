const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/', webhookController.createWebhook);
router.get('/', webhookController.getWebhooks);
router.patch('/:id', webhookController.updateWebhook);
router.delete('/:id', webhookController.deleteWebhook);
router.post('/:id/test', webhookController.testWebhook);

module.exports = router;


