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
const mongoose = require('mongoose');

/**
 * Fonction utilitaire pour normaliser une note avec des IDs en strings
 */
function normalizeNote(note) {
  if (!note) return null;
  
  const noteObj = note.toObject ? note.toObject() : note;
  const normalized = {
    ...noteObj,
    id: String(noteObj._id || noteObj.id),
    _id: String(noteObj._id || noteObj.id),
  };
  
  // Normaliser les IDs des références
  if (normalized.owner_id) {
    normalized.owner_id = normalized.owner_id._id 
      ? String(normalized.owner_id._id) 
      : String(normalized.owner_id);
  }
  if (normalized.last_modified_by) {
    normalized.last_modified_by = normalized.last_modified_by._id 
      ? String(normalized.last_modified_by._id) 
      : String(normalized.last_modified_by);
  }
  if (normalized.folder_id) {
    normalized.folder_id = String(normalized.folder_id);
  }
  if (normalized.shared_with && Array.isArray(normalized.shared_with)) {
    normalized.shared_with = normalized.shared_with.map(share => ({
      ...share,
      user_id: share.user_id?._id 
        ? String(share.user_id._id) 
        : (share.user_id ? String(share.user_id) : share.user_id),
    }));
  }
  
  return normalized;
}

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

    // Normaliser la note avec des IDs en strings
    const noteResponse = normalizeNote(note);

    return successResponse(res, { note: noteResponse }, 201);
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
    const { 
      folder_id, 
      shared_with_me, 
      is_favorite,
      date_from,
      date_to,
      search,
      sort_by = 'updated_at',
      sort_order = 'desc'
    } = req.query;

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

    // Filtre favoris
    if (is_favorite === 'true') {
      query.is_favorite = true;
    }

    // Filtres de date
    if (date_from || date_to) {
      query.updated_at = {};
      if (date_from) {
        query.updated_at.$gte = new Date(date_from);
      }
      if (date_to) {
        query.updated_at.$lte = new Date(date_to);
      }
    }

    // Recherche dans le titre et le contenu
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Tri
    const sortOptions = {};
    const validSortFields = ['updated_at', 'created_at', 'title'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'updated_at';
    const sortDir = sort_order === 'asc' ? 1 : -1;
    sortOptions[sortField] = sortDir;

    // Utiliser .lean() pour améliorer les performances et limiter les champs populés
    const notes = await Note.find(query)
      .populate('owner_id', 'email display_name')
      .populate('last_modified_by', 'email display_name')
      .select('title content owner_id folder_id shared_with is_public version last_modified_by is_deleted is_favorite created_at updated_at')
      .sort(sortOptions)
      .lean();

    // S'assurer que tous les IDs sont des strings
    const notesWithStringIds = notes.map(note => normalizeNote(note));

    return successResponse(res, {
      notes: notesWithStringIds,
      total: notesWithStringIds.length,
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

    // Vérifier que l'ID est valide
    if (!id || id === 'undefined' || id === '[object Object]') {
      logger.logError(new Error('Invalid note ID'), { 
        context: 'getNote',
        note_id: id,
        params: req.params
      });
      return errorResponse(res, 'Invalid note ID', 400);
    }

    // Vérifier que l'ID est un ObjectId valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      logger.logError(new Error('Invalid ObjectId format'), { 
        context: 'getNote',
        note_id: id
      });
      return errorResponse(res, 'Invalid note ID format', 400);
    }

    // Optimisation: Utiliser lean() et limiter les champs populés
    const note = await Note.findById(id)
      .populate('owner_id', 'email display_name avatar_url')
      .populate('last_modified_by', 'email display_name')
      .populate('shared_with.user_id', 'email display_name avatar_url')
      .lean();

    if (!note) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (note.is_deleted) {
      return errorResponse(res, 'Note has been deleted', 404);
    }

    // Vérifier les permissions - Optimisation: vérifier d'abord si c'est le propriétaire
    const userIdObj = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : userId;
    
    const ownerId = note.owner_id?._id || note.owner_id;
    const ownerIdStr = ownerId?.toString();
    const userIdStr = userIdObj?.toString();
    
    // Le propriétaire a toujours accès - vérifier en premier (cas le plus fréquent)
    if (ownerIdStr !== userIdStr) {
      // Vérifier les permissions partagées seulement si ce n'est pas le propriétaire
      const hasSharedAccess = note.shared_with && note.shared_with.some(share => {
        const shareUserId = share.user_id?._id || share.user_id;
        return shareUserId?.toString() === userIdStr;
      });
      
      if (!hasSharedAccess) {
        logger.logWarn('Access denied to note', { 
          userId: userIdStr, 
          noteId: id, 
          ownerId: ownerIdStr
        });
        return errorResponse(res, 'Access denied', 403);
      }
    }

    // Normaliser la note avec des IDs en strings (note est déjà un objet plain avec lean())
    const noteResponse = normalizeNote(note);

    return successResponse(res, { note: noteResponse });
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

    // S'assurer que l'ID est retourné comme string
    const noteResponse = note.toObject ? note.toObject() : note;
    noteResponse.id = String(note._id);
    noteResponse._id = String(note._id);
    
    // Convertir les IDs des références aussi
    if (noteResponse.owner_id) {
      noteResponse.owner_id = noteResponse.owner_id._id ? String(noteResponse.owner_id._id) : String(noteResponse.owner_id);
    }
    if (noteResponse.last_modified_by) {
      noteResponse.last_modified_by = noteResponse.last_modified_by._id ? String(noteResponse.last_modified_by._id) : String(noteResponse.last_modified_by);
    }
    if (noteResponse.shared_with) {
      noteResponse.shared_with = noteResponse.shared_with.map(share => ({
        ...share,
        user_id: share.user_id?._id ? String(share.user_id._id) : String(share.user_id),
      }));
    }

    return successResponse(res, { note: noteResponse });
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

    // S'assurer que l'ID est retourné comme string
    const noteResponse = note.toObject ? note.toObject() : note;
    noteResponse.id = String(note._id);
    noteResponse._id = String(note._id);
    
    // Convertir les IDs des références aussi
    if (noteResponse.owner_id) {
      noteResponse.owner_id = noteResponse.owner_id._id ? String(noteResponse.owner_id._id) : String(noteResponse.owner_id);
    }
    if (noteResponse.last_modified_by) {
      noteResponse.last_modified_by = noteResponse.last_modified_by._id ? String(noteResponse.last_modified_by._id) : String(noteResponse.last_modified_by);
    }
    if (noteResponse.shared_with) {
      noteResponse.shared_with = noteResponse.shared_with.map(share => ({
        ...share,
        user_id: share.user_id?._id ? String(share.user_id._id) : String(share.user_id),
      }));
    }

    return successResponse(res, { note: noteResponse });
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

    // S'assurer que l'ID est retourné comme string
    const noteResponse = note.toObject ? note.toObject() : note;
    noteResponse.id = String(note._id);
    noteResponse._id = String(note._id);
    
    // Convertir les IDs des références aussi
    if (noteResponse.owner_id) {
      noteResponse.owner_id = noteResponse.owner_id._id ? String(noteResponse.owner_id._id) : String(noteResponse.owner_id);
    }
    if (noteResponse.last_modified_by) {
      noteResponse.last_modified_by = noteResponse.last_modified_by._id ? String(noteResponse.last_modified_by._id) : String(noteResponse.last_modified_by);
    }
    if (noteResponse.shared_with) {
      noteResponse.shared_with = noteResponse.shared_with.map(share => ({
        ...share,
        user_id: share.user_id?._id ? String(share.user_id._id) : String(share.user_id),
      }));
    }

    return successResponse(res, { note: noteResponse });
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

    // S'assurer que l'ID est retourné comme string
    const noteResponse = note.toObject ? note.toObject() : note;
    noteResponse.id = String(note._id);
    noteResponse._id = String(note._id);
    
    // Convertir les IDs des références aussi
    if (noteResponse.owner_id) {
      noteResponse.owner_id = noteResponse.owner_id._id ? String(noteResponse.owner_id._id) : String(noteResponse.owner_id);
    }
    if (noteResponse.last_modified_by) {
      noteResponse.last_modified_by = noteResponse.last_modified_by._id ? String(noteResponse.last_modified_by._id) : String(noteResponse.last_modified_by);
    }
    if (noteResponse.shared_with) {
      noteResponse.shared_with = noteResponse.shared_with.map(share => ({
        ...share,
        user_id: share.user_id?._id ? String(share.user_id._id) : String(share.user_id),
      }));
    }

    return successResponse(res, { note: noteResponse });
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

    // S'assurer que l'ID est retourné comme string
    const noteResponse = note.toObject ? note.toObject() : note;
    noteResponse.id = String(note._id);
    noteResponse._id = String(note._id);
    
    // Convertir les IDs des références aussi
    if (noteResponse.owner_id) {
      noteResponse.owner_id = noteResponse.owner_id._id ? String(noteResponse.owner_id._id) : String(noteResponse.owner_id);
    }
    if (noteResponse.last_modified_by) {
      noteResponse.last_modified_by = noteResponse.last_modified_by._id ? String(noteResponse.last_modified_by._id) : String(noteResponse.last_modified_by);
    }
    if (noteResponse.shared_with) {
      noteResponse.shared_with = noteResponse.shared_with.map(share => ({
        ...share,
        user_id: share.user_id?._id ? String(share.user_id._id) : String(share.user_id),
      }));
    }

    return successResponse(res, { note: noteResponse });
  } catch (error) {
    logger.logError(error, { context: 'getPublicNote' });
    next(error);
  }
};

/**
 * Basculer le statut favori d'une note
 */
exports.toggleFavorite = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid note ID format', 400);
    }

    const note = await Note.findById(id);

    if (!note || note.is_deleted) {
      return errorResponse(res, 'Note not found', 404);
    }

    // Vérifier les permissions
    if (!note.hasPermission(userId, 'read')) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Basculer le statut favori
    note.is_favorite = !note.is_favorite;
    await note.save();

    await logActivity(req, 'note_favorite_toggle', 'note', note._id, { 
      is_favorite: note.is_favorite 
    });

    logger.logInfo('Note favorite toggled', { 
      userId, 
      note_id: note._id, 
      is_favorite: note.is_favorite 
    });

    invalidateUserCache(userId);

    return successResponse(res, { 
      note: normalizeNote(note),
      is_favorite: note.is_favorite 
    });
  } catch (error) {
    logger.logError(error, { context: 'toggleFavorite' });
    next(error);
  }
};

/**
 * Exporter une note dans différents formats
 */
exports.exportNote = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { format = 'txt' } = req.query; // txt, md, pdf

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(res, 'Invalid note ID format', 400);
    }

    const note = await Note.findById(id)
      .populate('owner_id', 'email display_name');

    if (!note || note.is_deleted) {
      return errorResponse(res, 'Note not found', 404);
    }

    // Vérifier les permissions
    if (!note.hasPermission(userId, 'read')) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Convertir le contenu HTML en texte brut
    const stripHtml = (html) => {
      if (!html) return '';
      return html
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    };

    const plainText = stripHtml(note.content || '');
    const title = note.title || 'Sans titre';
    const date = new Date(note.updated_at || Date.now()).toLocaleString('fr-FR');

    let content, filename, contentType;

    switch (format.toLowerCase()) {
      case 'md':
      case 'markdown':
        // Export Markdown
        content = `# ${title}\n\n*Exporté le ${date}*\n\n${plainText}`;
        filename = `${title.replace(/[^a-z0-9]/gi, '_')}.md`;
        contentType = 'text/markdown';
        break;

      case 'pdf':
        // Pour PDF, on utilisera une bibliothèque comme pdfkit ou puppeteer
        // Pour l'instant, on retourne une erreur indiquant que c'est à implémenter
        return errorResponse(res, 'Export PDF non implémenté. Utilisez txt ou md.', 501);

      case 'txt':
      default:
        // Export texte brut
        content = `${title}\n${'='.repeat(title.length)}\n\nExporté le ${date}\n\n${plainText}`;
        filename = `${title.replace(/[^a-z0-9]/gi, '_')}.txt`;
        contentType = 'text/plain';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);

    await logActivity(req, 'note_export', 'note', note._id, { format });
    logger.logInfo('Note exported', { userId, note_id: note._id, format });
  } catch (error) {
    logger.logError(error, { context: 'exportNote' });
    next(error);
  }
};


