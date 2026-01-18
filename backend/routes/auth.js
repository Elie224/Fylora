const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, signupSchema, loginSchema } = require('../middlewares/validation');
const { initiateOAuth, handleOAuthCallback } = require('../controllers/oauthController');
const billingService = require('../services/billingService');

// GET /api/auth/stripe-publishable-key - Obtenir la clé publique Stripe
router.get('/stripe-publishable-key', async (req, res, next) => {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      return res.status(503).json({
        error: { message: 'Stripe n\'est pas configuré' }
      });
    }

    res.status(200).json({
      data: {
        publishableKey: publishableKey
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-card - Vérifier une carte bancaire avant l'inscription
router.post('/verify-card', async (req, res, next) => {
  try {
    const { email, paymentMethodId, firstName, lastName } = req.body;

    if (!email || !paymentMethodId) {
      return res.status(400).json({
        error: { message: 'Email et paymentMethodId sont requis' }
      });
    }

    if (!billingService.isStripeConfigured()) {
      return res.status(503).json({
        error: { message: 'La vérification de carte n\'est pas disponible actuellement' }
      });
    }

    // Vérifier si un compte avec les mêmes informations existe déjà
    const User = require('../models/userModel');
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: { message: 'Cet email est déjà utilisé. Veuillez vous connecter ou utiliser un autre email.' }
      });
    }

    // Vérifier les similarités avec des comptes existants
    if (firstName && lastName) {
      const similarUsers = await User.find({
        $or: [
          { first_name: { $regex: new RegExp(`^${firstName}$`, 'i') }, last_name: { $regex: new RegExp(`^${lastName}$`, 'i') } },
        ]
      }).limit(5);
      
      if (similarUsers.length > 0) {
        // Compter les utilisateurs avec carte vérifiée
        const verifiedSimilar = similarUsers.filter(u => u.card_verified).length;
        if (verifiedSimilar > 0) {
          return res.status(409).json({
            error: { message: 'Des informations similaires à un compte existant ont été détectées. Veuillez contacter le support si vous pensez qu\'il s\'agit d\'une erreur.' }
          });
        }
      }
    }

    const result = await billingService.verifyCardForSignup(email, paymentMethodId);

    res.status(200).json({
      data: {
        success: result.success,
        customerId: result.customerId,
        message: 'Carte bancaire vérifiée avec succès. Aucun prélèvement n\'a été effectué.'
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/signup
router.post('/signup', signupSchema, validate, authController.signup);

// POST /api/auth/login
router.post('/login', loginSchema, validate, authController.login);

// POST /api/auth/refresh
router.post('/refresh', authController.refresh);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// Routes OAuth - Initiation (Google uniquement)
router.get('/google', initiateOAuth('google'));

// Routes OAuth - Callbacks (Google uniquement)
router.get('/google/callback', handleOAuthCallback('google'));

// Route pour vérifier les tokens Google natifs (mobile)
router.post('/google/verify', authController.verifyGoogleToken);

// Route pour supprimer définitivement le compte (nécessite authentification)
const { authMiddleware } = require('../middlewares/authMiddleware');
router.delete('/account', authMiddleware, authController.deleteAccount);

module.exports = router;



