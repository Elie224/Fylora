const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Obtenir le nombre de notifications non lues
router.get('/unread-count', notificationsController.getUnreadCount);

// Lister les notifications
router.get('/', notificationsController.listNotifications);

// Marquer toutes comme lues
router.post('/mark-all-read', notificationsController.markAllAsRead);

// Marquer une notification comme lue
router.patch('/:id/read', notificationsController.markAsRead);

// Supprimer une notification
router.delete('/:id', notificationsController.deleteNotification);

module.exports = router;





