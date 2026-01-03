const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const adminController = require('../controllers/adminController');

// Route temporaire pour définir l'admin (accessible sans droits admin, mais nécessite authentification)
// ⚠️ Cette route doit être supprimée après avoir défini l'admin pour des raisons de sécurité
router.post('/set-admin', authMiddleware, adminController.setAdminUser);

// Toutes les autres routes admin nécessitent l'authentification et les droits admin
router.use(authMiddleware);
router.use(adminMiddleware);

// Statistiques générales
router.get('/stats', adminController.getStats);

// Gestion des utilisateurs
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.post('/users/:id/extend-storage', adminController.extendStorage); // Route dédiée pour étendre le stockage
router.delete('/users/:id', adminController.deleteUser);

// Nettoyer les fichiers orphelins
router.post('/cleanup-orphans', adminController.cleanupOrphans);
router.get('/cleanup-stats', adminController.getCleanupStats);

// Route temporaire pour définir l'admin (à supprimer après utilisation)
// ⚠️ Cette route doit être supprimée après avoir défini l'admin pour des raisons de sécurité
router.post('/set-admin', adminController.setAdminUser);

module.exports = router;

