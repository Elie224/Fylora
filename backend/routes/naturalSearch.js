const express = require('express');
const router = express.Router();
const naturalSearchController = require('../controllers/naturalSearchController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', naturalSearchController.naturalSearch);

module.exports = router;


