const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Créer un commentaire
router.post('/notes/:note_id/comments', commentsController.createComment);

// Lister les commentaires d'une note
router.get('/notes/:note_id/comments', commentsController.listComments);

// Répondre à un commentaire
router.post('/comments/:comment_id/reply', commentsController.replyToComment);

// Résoudre un commentaire
router.patch('/comments/:comment_id/resolve', commentsController.resolveComment);

// Supprimer un commentaire
router.delete('/comments/:comment_id', commentsController.deleteComment);

module.exports = router;





