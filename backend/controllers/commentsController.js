/**
 * Contrôleur pour gérer les commentaires sur les notes
 */
const Comment = require('../models/Comment');
const Note = require('../models/Note');
const { successResponse, errorResponse } = require('../utils/response');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { logActivity } = require('../middlewares/activityLogger');

/**
 * Créer un commentaire
 */
exports.createComment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { note_id } = req.params;
    const { content, position } = req.body;

    // Vérifier que la note existe et que l'utilisateur a les permissions
    const note = await Note.findById(note_id);
    if (!note || note.is_deleted) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (!note.hasPermission(userId, 'read')) {
      return errorResponse(res, 'Access denied', 403);
    }

    const comment = await Comment.create({
      note_id,
      user_id: userId,
      content,
      position: position || { start: 0, end: 0 },
    });

    await logActivity(req, 'comment_create', 'note', note_id, { comment_id: comment._id });

    logger.logInfo('Comment created', { userId, note_id, comment_id: comment._id });

    const populatedComment = await Comment.findById(comment._id)
      .populate('user_id', 'email display_name avatar_url');

    return successResponse(res, { comment: populatedComment }, 201);
  } catch (error) {
    logger.logError(error, { context: 'createComment' });
    next(error);
  }
};

/**
 * Lister les commentaires d'une note
 */
exports.listComments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { note_id } = req.params;
    const { resolved_only, unresolved_only } = req.query;

    // Vérifier les permissions
    const note = await Note.findById(note_id);
    if (!note || note.is_deleted) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (!note.hasPermission(userId, 'read')) {
      return errorResponse(res, 'Access denied', 403);
    }

    let query = { note_id };
    if (resolved_only === 'true') {
      query.resolved = true;
    } else if (unresolved_only === 'true') {
      query.resolved = false;
    }

    const comments = await Comment.find(query)
      .populate('user_id', 'email display_name avatar_url')
      .populate('resolved_by', 'email display_name')
      .populate('replies.user_id', 'email display_name avatar_url')
      .sort({ created_at: -1 });

    return successResponse(res, {
      comments,
      total: comments.length,
    });
  } catch (error) {
    logger.logError(error, { context: 'listComments' });
    next(error);
  }
};

/**
 * Répondre à un commentaire
 */
exports.replyToComment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { comment_id } = req.params;
    const { content } = req.body;

    const comment = await Comment.findById(comment_id);
    if (!comment) {
      return errorResponse(res, 'Comment not found', 404);
    }

    // Vérifier les permissions sur la note
    const note = await Note.findById(comment.note_id);
    if (!note || note.is_deleted) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (!note.hasPermission(userId, 'read')) {
      return errorResponse(res, 'Access denied', 403);
    }

    comment.replies.push({
      user_id: userId,
      content,
    });

    await comment.save();

    const populatedComment = await Comment.findById(comment._id)
      .populate('user_id', 'email display_name avatar_url')
      .populate('replies.user_id', 'email display_name avatar_url');

    await logActivity(req, 'comment_reply', 'note', comment.note_id, { comment_id });

    logger.logInfo('Comment replied', { userId, comment_id });

    return successResponse(res, { comment: populatedComment });
  } catch (error) {
    logger.logError(error, { context: 'replyToComment' });
    next(error);
  }
};

/**
 * Résoudre un commentaire
 */
exports.resolveComment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { comment_id } = req.params;

    const comment = await Comment.findById(comment_id);
    if (!comment) {
      return errorResponse(res, 'Comment not found', 404);
    }

    // Vérifier les permissions sur la note
    const note = await Note.findById(comment.note_id);
    if (!note || note.is_deleted) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (!note.hasPermission(userId, 'write')) {
      return errorResponse(res, 'Access denied', 403);
    }

    comment.resolved = true;
    comment.resolved_by = userId;
    comment.resolved_at = new Date();

    await comment.save();

    await logActivity(req, 'comment_resolve', 'note', comment.note_id, { comment_id });

    logger.logInfo('Comment resolved', { userId, comment_id });

    return successResponse(res, { comment });
  } catch (error) {
    logger.logError(error, { context: 'resolveComment' });
    next(error);
  }
};

/**
 * Supprimer un commentaire
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { comment_id } = req.params;

    const comment = await Comment.findById(comment_id);
    if (!comment) {
      return errorResponse(res, 'Comment not found', 404);
    }

    // Seul l'auteur ou un admin peut supprimer
    const note = await Note.findById(comment.note_id);
    if (!note || note.is_deleted) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (comment.user_id.toString() !== userId.toString() && !note.hasPermission(userId, 'admin')) {
      return errorResponse(res, 'Access denied', 403);
    }

    await Comment.findByIdAndDelete(comment_id);

    await logActivity(req, 'comment_delete', 'note', comment.note_id, { comment_id });

    logger.logInfo('Comment deleted', { userId, comment_id });

    return successResponse(res, { message: 'Comment deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'deleteComment' });
    next(error);
  }
};





