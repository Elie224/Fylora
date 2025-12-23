/**
 * Contrôleur pour gérer les notes collaboratives
 */
const Note = require('../models/Note');
const { v4: uuidv4 } = require('uuid');
const { successResponse, errorResponse } = require('../utils/response');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { logActivity } = require('../middlewares/activityLogger');
const { invalidateUserCache } = require('../utils/cache');

/**
 * Créer une nouvelle note
 */
exports.createNote = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, folder_id, content } = req.body;

    // Créer la note sans définir public_token (sera null par défaut)
    const noteData = {
      title: title || 'Nouvelle note',
      content: content || '',
      owner_id: userId,
      folder_id: folder_id || null,
      last_modified_by: userId,
    };
    // Ne pas inclure public_token dans les données pour éviter les problèmes d'index

    const note = await Note.create(noteData);

    await logActivity(req, 'note_create', 'note', note._id, { title: note.title });

    logger.logInfo('Note created', { userId, note_id: note._id });

    // Invalider le cache des notes
    invalidateUserCache(userId);

    return successResponse(res, { note }, 201);
  } catch (error) {
    // Gérer spécifiquement les erreurs d'index unique
    if (error.code === 11000 && error.keyPattern?.public_token) {
      logger.logError(error, { context: 'createNote', issue: 'public_token index error' });
      return errorResponse(res, 'Erreur lors de la création de la note. Veuillez exécuter: npm run fix-note-index', 500);
    }
    logger.logError(error, { context: 'createNote' });
    next(error);
  }
};

/**
 * Lister les notes de l'utilisateur
 */
exports.listNotes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { folder_id, shared_with_me } = req.query;

    let query = { is_deleted: false };

    if (shared_with_me === 'true') {
      // Notes partagées avec l'utilisateur
      query['shared_with.user_id'] = userId;
      query.owner_id = { $ne: userId };
    } else {
      // Notes de l'utilisateur
      query.owner_id = userId;
    }

    if (folder_id) {
      query.folder_id = folder_id;
    }

    // Utiliser .lean() pour améliorer les performances et limiter les champs populés
    const notes = await Note.find(query)
      .populate('owner_id', 'email display_name')
      .populate('last_modified_by', 'email display_name')
      .select('title content owner_id folder_id shared_with is_public version last_modified_by is_deleted created_at updated_at')
      .sort({ updated_at: -1 })
      .lean();

    return successResponse(res, {
      notes,
      total: notes.length,
    });
  } catch (error) {
    logger.logError(error, { context: 'listNotes' });
    next(error);
  }
};

/**
 * Obtenir une note spécifique
 */
exports.getNote = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const note = await Note.findById(id)
      .populate('owner_id', 'email display_name avatar_url')
      .populate('last_modified_by', 'email display_name')
      .populate('shared_with.user_id', 'email display_name avatar_url');

    if (!note) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (note.is_deleted) {
      return errorResponse(res, 'Note has been deleted', 404);
    }

    // Vérifier les permissions
    // Convertir userId en ObjectId si nécessaire pour la comparaison
    const mongoose = require('mongoose');
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;
    
    const ownerId = note.owner_id?._id || note.owner_id;
    const ownerIdStr = ownerId?.toString();
    const userIdStr = userIdObj?.toString();
    
    // Le propriétaire a toujours accès
    if (ownerIdStr === userIdStr) {
      return successResponse(res, { note });
    }

    // Vérifier les permissions partagées
    const hasSharedAccess = note.shared_with.some(share => {
      const shareUserId = share.user_id?._id || share.user_id;
      return shareUserId?.toString() === userIdStr;
    });

    if (!hasSharedAccess) {
      logger.logWarn('Access denied to note', { 
        userId: userIdStr, 
        noteId: id, 
        ownerId: ownerIdStr,
        ownerIdType: typeof ownerId,
        userIdType: typeof userId,
        sharedWith: note.shared_with.map(s => ({
          userId: (s.user_id?._id || s.user_id)?.toString(),
          permission: s.permission
        }))
      });
      return errorResponse(res, 'Access denied', 403);
    }

    return successResponse(res, { note });
  } catch (error) {
    logger.logError(error, { context: 'getNote' });
    next(error);
  }
};

/**
 * Mettre à jour une note
 */
exports.updateNote = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, content, version } = req.body;

    const note = await Note.findById(id);

    if (!note) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (note.is_deleted) {
      return errorResponse(res, 'Note has been deleted', 404);
    }

    // Vérifier les permissions d'écriture
    if (!note.hasPermission(userId, 'write')) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Gestion de version optimiste (pour éviter les conflits)
    if (version && note.version !== version) {
      return errorResponse(res, 'Note has been modified by another user. Please refresh.', 409);
    }

    // Mettre à jour
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    note.version = (note.version || 1) + 1;
    note.last_modified_by = userId;
    note.updated_at = new Date();

    await note.save();

    await logActivity(req, 'note_update', 'note', note._id, { title: note.title });

    logger.logInfo('Note updated', { userId, note_id: id });

    // Invalider le cache des notes
    invalidateUserCache(userId);

    return successResponse(res, { note });
  } catch (error) {
    logger.logError(error, { context: 'updateNote' });
    next(error);
  }
};

/**
 * Supprimer une note (corbeille)
 */
exports.deleteNote = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const note = await Note.findById(id);

    if (!note) {
      return errorResponse(res, 'Note not found', 404);
    }

    // Seul le propriétaire ou un admin peut supprimer
    if (note.owner_id.toString() !== userId.toString() && !note.hasPermission(userId, 'admin')) {
      return errorResponse(res, 'Access denied', 403);
    }

    note.is_deleted = true;
    note.deleted_at = new Date();
    await note.save();

    await logActivity(req, 'note_delete', 'note', note._id, { title: note.title });

    logger.logInfo('Note deleted', { userId, note_id: id });

    // Invalider le cache des notes
    invalidateUserCache(userId);

    return successResponse(res, { message: 'Note deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'deleteNote' });
    next(error);
  }
};

/**
 * Supprimer définitivement une note
 */
exports.permanentDeleteNote = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const note = await Note.findById(id);

    if (!note || !note.is_deleted) {
      return errorResponse(res, 'Note not found in trash', 404);
    }

    if (note.owner_id.toString() !== userId.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    await Note.findByIdAndDelete(id);

    await logActivity(req, 'note_permanent_delete', 'note', id);

    logger.logInfo('Note permanently deleted', { userId, note_id: id });

    return successResponse(res, { message: 'Note permanently deleted' });
  } catch (error) {
    logger.logError(error, { context: 'permanentDeleteNote' });
    next(error);
  }
};

/**
 * Restaurer une note
 */
exports.restoreNote = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const note = await Note.findById(id);

    if (!note || !note.is_deleted) {
      return errorResponse(res, 'Note not found in trash', 404);
    }

    if (note.owner_id.toString() !== userId.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    note.is_deleted = false;
    note.deleted_at = null;
    await note.save();

    await logActivity(req, 'note_restore', 'note', note._id);

    logger.logInfo('Note restored', { userId, note_id: id });

    return successResponse(res, { note });
  } catch (error) {
    logger.logError(error, { context: 'restoreNote' });
    next(error);
  }
};

/**
 * Partager une note avec un utilisateur
 */
exports.shareNote = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { user_id, permission } = req.body;

    const note = await Note.findById(id);

    if (!note) {
      return errorResponse(res, 'Note not found', 404);
    }

    // Seul le propriétaire ou un admin peut partager
    if (note.owner_id.toString() !== userId.toString() && !note.hasPermission(userId, 'admin')) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Vérifier si déjà partagé
    const existingShare = note.shared_with.find(
      s => s.user_id.toString() === user_id
    );

    if (existingShare) {
      existingShare.permission = permission || 'read';
    } else {
      note.shared_with.push({
        user_id,
        permission: permission || 'read',
      });
    }

    await note.save();

    await logActivity(req, 'note_share', 'note', note._id, { shared_with: user_id });

    logger.logInfo('Note shared', { userId, note_id: id, shared_with: user_id });

    return successResponse(res, { note });
  } catch (error) {
    logger.logError(error, { context: 'shareNote' });
    next(error);
  }
};

/**
 * Retirer le partage d'une note
 */
exports.unshareNote = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { user_id } = req.body;

    const note = await Note.findById(id);

    if (!note) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (note.owner_id.toString() !== userId.toString() && !note.hasPermission(userId, 'admin')) {
      return errorResponse(res, 'Access denied', 403);
    }

    note.shared_with = note.shared_with.filter(
      s => s.user_id.toString() !== user_id
    );

    await note.save();

    await logActivity(req, 'note_unshare', 'note', note._id, { unshared_with: user_id });

    logger.logInfo('Note unshared', { userId, note_id: id, unshared_with: user_id });

    return successResponse(res, { note });
  } catch (error) {
    logger.logError(error, { context: 'unshareNote' });
    next(error);
  }
};

/**
 * Créer un lien public pour une note
 */
exports.createPublicLink = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { password, expires_at } = req.body;

    const note = await Note.findById(id);

    if (!note) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (note.owner_id.toString() !== userId.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    const publicToken = uuidv4();
    note.is_public = true;
    note.public_token = publicToken;

    await note.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const shareUrl = `${frontendUrl}/notes/public/${publicToken}`;

    logger.logInfo('Public link created for note', { userId, note_id: id });

    return successResponse(res, {
      share_url: shareUrl,
      public_token: publicToken,
    });
  } catch (error) {
    logger.logError(error, { context: 'createPublicLink' });
    next(error);
  }
};

/**
 * Obtenir une note publique
 */
exports.getPublicNote = async (req, res, next) => {
  try {
    const { token } = req.params;

    const note = await Note.findOne({
      public_token: token,
      is_public: true,
      is_deleted: false,
    })
      .populate('owner_id', 'email display_name');

    if (!note) {
      return errorResponse(res, 'Note not found or access denied', 404);
    }

    return successResponse(res, { note });
  } catch (error) {
    logger.logError(error, { context: 'getPublicNote' });
    next(error);
  }
};


