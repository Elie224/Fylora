const express = require('express');
const router = express.Router();
const fileCommentController = require('../controllers/fileCommentController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/files/:id/comments', fileCommentController.createComment);
router.get('/files/:id/comments', fileCommentController.getComments);
router.patch('/comments/:commentId', fileCommentController.updateComment);
router.delete('/comments/:commentId', fileCommentController.deleteComment);
router.post('/comments/:commentId/resolve', fileCommentController.resolveComment);
router.post('/comments/:commentId/reaction', fileCommentController.addReaction);

module.exports = router;


