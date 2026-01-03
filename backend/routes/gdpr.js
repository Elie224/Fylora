/**
 * Routes GDPR/RGPD pour la conformité avec le Règlement Général sur la Protection des Données
 * 
 * Ces routes permettent aux utilisateurs d'exercer leurs droits RGPD :
 * - Article 15 : Droit d'accès
 * - Article 17 : Droit à l'effacement
 * - Article 20 : Droit à la portabilité
 */

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const gdprController = require('../controllers/gdprController');

// Toutes les routes GDPR nécessitent une authentification
router.use(authMiddleware);

// Article 15 RGPD - Droit d'accès aux données personnelles
router.get('/export', gdprController.exportUserData);
router.get('/export/:id', gdprController.exportUserData);

// Article 20 RGPD - Droit à la portabilité des données
router.get('/portability', gdprController.exportDataPortability);

// Article 17 RGPD - Droit à l'effacement (droit à l'oubli)
router.delete('/delete', gdprController.deleteUserData);
router.delete('/delete/:id', gdprController.deleteUserData);

// Consentement RGPD
router.get('/consent', gdprController.getConsentStatus);
router.post('/consent', gdprController.updateConsent);

module.exports = router;

