/**
 * Contrôleur pour gérer l'historique des versions des notes
 */
const Note = require('../models/Note');
const NoteVersion = require('../models/NoteVersion');
const { successResponse, errorResponse } = require('../utils/response');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { logActivity } = require('../middlewares/activityLogger');

/**
 * Créer une version d'une note
 */
exports.createVersion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { note_id } = req.params;

    const note = await Note.findById(note_id);
    if (!note || note.is_deleted) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (!note.hasPermission(userId, 'write')) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Créer une nouvelle version
    const version = await NoteVersion.create({
      note_id,
      version_number: (note.version || 1),
      content: note.content,
      title: note.title,
      created_by: userId,
    });

    await logActivity(req, 'note_version_create', 'note', note_id, { version_number: version.version_number });

    logger.logInfo('Note version created', { userId, note_id, version_id: version._id });

    return successResponse(res, { version }, 201);
  } catch (error) {
    logger.logError(error, { context: 'createVersion' });
    next(error);
  }
};

/**
 * Lister les versions d'une note
 */
exports.listVersions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { note_id } = req.params;

    const note = await Note.findById(note_id);
    if (!note || note.is_deleted) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (!note.hasPermission(userId, 'read')) {
      return errorResponse(res, 'Access denied', 403);
    }

    const versions = await NoteVersion.find({ note_id })
      .populate('created_by', 'email display_name')
      .sort({ version_number: -1 });

    return successResponse(res, {
      note_id,
      versions,
      total: versions.length,
      current_version: note.version,
    });
  } catch (error) {
    logger.logError(error, { context: 'listVersions' });
    next(error);
  }
};

/**
 * Restaurer une version spécifique
 */
exports.restoreVersion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { note_id, version_id } = req.params;

    const note = await Note.findById(note_id);
    if (!note || note.is_deleted) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (!note.hasPermission(userId, 'write')) {
      return errorResponse(res, 'Access denied', 403);
    }

    const version = await NoteVersion.findById(version_id);
    if (!version || version.note_id.toString() !== note_id) {
      return errorResponse(res, 'Version not found', 404);
    }

    // Créer une nouvelle version avant restauration
    await exports.createVersion({ user: { id: userId }, params: { note_id } }, res, () => {});

    // Restaurer la version
    note.title = version.title;
    note.content = version.content;
    note.version = (note.version || 1) + 1;
    note.last_modified_by = userId;
    note.updated_at = new Date();

    await note.save();

    await logActivity(req, 'note_version_restore', 'note', note_id, { version_id });

    logger.logInfo('Note version restored', { userId, note_id, version_id });

    return successResponse(res, {
      message: 'Version restored successfully',
      note,
      restored_version: version,
    });
  } catch (error) {
    logger.logError(error, { context: 'restoreVersion' });
    next(error);
  }
};

/**
 * Comparer deux versions
 */
exports.compareVersions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { note_id } = req.params;
    const { version1_id, version2_id } = req.query;

    const note = await Note.findById(note_id);
    if (!note || note.is_deleted) {
      return errorResponse(res, 'Note not found', 404);
    }

    if (!note.hasPermission(userId, 'read')) {
      return errorResponse(res, 'Access denied', 403);
    }

    const version1 = await NoteVersion.findById(version1_id);
    const version2 = await NoteVersion.findById(version2_id);

    if (!version1 || !version2) {
      return errorResponse(res, 'One or both versions not found', 404);
    }

    if (version1.note_id.toString() !== note_id || version2.note_id.toString() !== note_id) {
      return errorResponse(res, 'Versions do not belong to this note', 400);
    }

    // Comparaison simple (pour une comparaison plus avancée, utiliser une librairie comme diff)
    const comparison = {
      version1: {
        id: version1._id,
        version_number: version1.version_number,
        title: version1.title,
        content: version1.content,
        created_at: version1.created_at,
      },
      version2: {
        id: version2._id,
        version_number: version2.version_number,
        title: version2.title,
        content: version2.content,
        created_at: version2.created_at,
      },
      differences: {
        title_changed: version1.title !== version2.title,
        content_changed: version1.content !== version2.content,
        content_length_diff: version2.content.length - version1.content.length,
      },
    };

    return successResponse(res, { comparison });
  } catch (error) {
    logger.logError(error, { context: 'compareVersions' });
    next(error);
  }
};





