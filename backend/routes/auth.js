const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, signupSchema, loginSchema } = require('../middlewares/validation');
const { initiateOAuth, handleOAuthCallback } = require('../controllers/oauthController');

// POST /api/auth/signup
router.post('/signup', signupSchema, validate, authController.signup);

// POST /api/auth/login
router.post('/login', loginSchema, validate, authController.login);

// POST /api/auth/refresh
router.post('/refresh', authController.refresh);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// Routes OAuth - Initiation
router.get('/google', initiateOAuth('google'));
router.get('/github', initiateOAuth('github'));

// Routes OAuth - Callbacks
router.get('/google/callback', handleOAuthCallback('google'));
router.get('/github/callback', handleOAuthCallback('github'));

// Route pour vérifier les tokens Google natifs (mobile)
router.post('/google/verify', authController.verifyGoogleToken);

module.exports = router;



