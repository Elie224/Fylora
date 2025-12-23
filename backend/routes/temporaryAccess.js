const express = require('express');
const router = express.Router();
const temporaryAccessController = require('../controllers/temporaryAccessController');
const { authMiddleware, optionalAuthMiddleware } = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, temporaryAccessController.createTemporaryAccess);
router.get('/', authMiddleware, temporaryAccessController.getTemporaryAccesses);
router.post('/use/:code', optionalAuthMiddleware, temporaryAccessController.useTemporaryAccess);
router.delete('/:id', authMiddleware, temporaryAccessController.revokeTemporaryAccess);

module.exports = router;


