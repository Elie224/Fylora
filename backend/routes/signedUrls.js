/**
 * Routes pour URLs signées temporaires
 */
const express = require('express');
const router = express.Router();
const signedUrlGenerator = require('../utils/signedUrl');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// Générer une URL signée
router.post('/generate', (req, res, next) => {
  try {
    const userId = req.user.id;
    const { fileId, expiresIn, action } = req.body;

    if (!fileId) {
      return res.status(400).json({
        error: { message: 'fileId is required' },
      });
    }

    const signed = signedUrlGenerator.generate(fileId, userId, {
      expiresIn: expiresIn || 3600,
      action: action || 'download',
    });

    res.status(200).json({
      data: signed,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


