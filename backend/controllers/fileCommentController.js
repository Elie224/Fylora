/**
 * Contrôleur pour les commentaires sur fichiers
 */
const FileComment = require('../models/FileComment');
const FileModel = require('../models/fileModel');

// Créer un commentaire
async function createComment(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content, position, parent_comment_id, mentions } = req.body;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const comment = new FileComment({
      file_id: id,
      user_id: userId,
      content,
      position: position || {},
      parent_comment_id: parent_comment_id || null,
      mentions: mentions || [],
    });

    await comment.save();
    await comment.populate('user_id', 'display_name email');

    res.status(201).json({
      data: comment,
      message: 'Comment created successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Obtenir les commentaires d'un fichier
async function getComments(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const comments = await FileComment.find({ file_id: id })
      .populate('user_id', 'display_name email')
      .populate('mentions', 'display_name email')
      .populate('resolved_by', 'display_name email')
      .sort({ created_at: 1 })
      .lean();

    res.status(200).json({ data: comments });
  } catch (err) {
    next(err);
  }
}

// Mettre à jour un commentaire
async function updateComment(req, res, next) {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    const comment = await FileComment.findOne({
      _id: commentId,
      user_id: userId,
    });

    if (!comment) {
      return res.status(404).json({ error: { message: 'Comment not found' } });
    }

    comment.content = content;
    comment.updated_at = new Date();
    await comment.save();

    res.status(200).json({
      data: comment,
      message: 'Comment updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Supprimer un commentaire
async function deleteComment(req, res, next) {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await FileComment.findOne({
      _id: commentId,
      user_id: userId,
    });

    if (!comment) {
      return res.status(404).json({ error: { message: 'Comment not found' } });
    }

    await FileComment.findByIdAndDelete(commentId);

    res.status(200).json({
      message: 'Comment deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Résoudre un commentaire
async function resolveComment(req, res, next) {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await FileComment.findOne({
      _id: commentId,
      file_id: { $exists: true },
    });

    if (!comment) {
      return res.status(404).json({ error: { message: 'Comment not found' } });
    }

    // Vérifier que l'utilisateur a accès au fichier
    const file = await FileModel.findById(comment.file_id);
    if (!file || file.owner_id !== userId) {
      return res.status(403).json({
        error: { message: 'You do not have permission to resolve this comment' },
      });
    }

    comment.resolved = true;
    comment.resolved_by = userId;
    comment.resolved_at = new Date();
    await comment.save();

    res.status(200).json({
      data: comment,
      message: 'Comment resolved successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Ajouter une réaction
async function addReaction(req, res, next) {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const { emoji } = req.body;

    const comment = await FileComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: { message: 'Comment not found' } });
    }

    // Retirer la réaction existante de l'utilisateur
    comment.reactions = comment.reactions.filter(
      r => r.user_id.toString() !== userId
    );

    // Ajouter la nouvelle réaction
    comment.reactions.push({
      user_id: userId,
      emoji: emoji || '👍',
    });

    await comment.save();

    res.status(200).json({
      data: comment,
      message: 'Reaction added successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  resolveComment,
  addReaction,
};


