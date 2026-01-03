/**
 * Contrôleur pour gérer les templates de notes
 */
const NoteTemplate = require('../models/NoteTemplate');
const Note = require('../models/Note');
const { successResponse, errorResponse } = require('../utils/response');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { logActivity } = require('../middlewares/activityLogger');

/**
 * Créer un template
 */
exports.createTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, description, content, category, is_public } = req.body;

    const template = await NoteTemplate.create({
      name,
      description,
      content: content || '',
      category: category || 'general',
      is_public: is_public || false,
      created_by: userId,
    });

    await logActivity(req, 'template_create', 'template', template._id, { name });

    logger.logInfo('Template created', { userId, template_id: template._id });

    return successResponse(res, { template }, 201);
  } catch (error) {
    logger.logError(error, { context: 'createTemplate' });
    next(error);
  }
};

/**
 * Lister les templates
 */
exports.listTemplates = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { category } = req.query;

    const query = {
      $or: [
        { is_public: true },
        { created_by: userId },
      ],
    };

    if (category) {
      query.category = category;
    }

    const templates = await NoteTemplate.find(query)
      .populate('created_by', 'email display_name')
      .sort({ usage_count: -1, created_at: -1 })
      .lean();

    // Formater les templates pour le frontend
    const formattedTemplates = templates.map(template => ({
      id: template._id.toString(),
      _id: template._id.toString(),
      name: template.name,
      description: template.description,
      content: template.content,
      category: template.category,
      is_public: template.is_public,
      created_by: template.created_by ? {
        id: template.created_by._id?.toString(),
        email: template.created_by.email,
        display_name: template.created_by.display_name
      } : null,
      usage_count: template.usage_count || 0,
      created_at: template.created_at ? (template.created_at instanceof Date ? template.created_at.toISOString() : template.created_at) : new Date().toISOString(),
      updated_at: template.updated_at ? (template.updated_at instanceof Date ? template.updated_at.toISOString() : template.updated_at) : new Date().toISOString(),
    }));

    return successResponse(res, {
      templates: formattedTemplates,
      total: formattedTemplates.length,
    });
  } catch (error) {
    logger.logError(error, { context: 'listTemplates' });
    next(error);
  }
};

/**
 * Créer une note depuis un template
 */
exports.createNoteFromTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { template_id } = req.params;
    const { title, folder_id } = req.body;

    // Vérifier que template_id est fourni
    if (!template_id || template_id === 'undefined') {
      logger.logError(new Error('Template ID is missing or undefined'), { 
        context: 'createNoteFromTemplate',
        template_id,
        params: req.params
      });
      return errorResponse(res, 'Template ID is required', 400);
    }

    const template = await NoteTemplate.findById(template_id);
    if (!template) {
      logger.logError(new Error('Template not found'), { 
        context: 'createNoteFromTemplate',
        template_id,
        userId
      });
      return errorResponse(res, 'Template not found', 404);
    }

    // Vérifier les permissions
    if (!template.is_public && template.created_by?.toString() !== userId.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Créer la note depuis le template
    const note = await Note.create({
      title: title || template.name,
      content: template.content,
      owner_id: userId,
      folder_id: folder_id || null,
      last_modified_by: userId,
    });

    // Incrémenter le compteur d'utilisation
    template.usage_count = (template.usage_count || 0) + 1;
    await template.save();

    // Logger l'activité (sans bloquer si ça échoue)
    logActivity(req, 'note_create_from_template', 'note', note._id, { template_id }).catch(err => {
      logger.logError(err, { context: 'logActivity_note_create_from_template' });
    });

    logger.logInfo('Note created from template', { userId, note_id: note._id, template_id });

    // Retourner la note avec l'ID formaté pour le frontend
    return successResponse(res, { 
      note: {
        id: note._id.toString(),
        _id: note._id.toString(),
        title: note.title,
        content: note.content,
        owner_id: note.owner_id.toString(),
        folder_id: note.folder_id ? note.folder_id.toString() : null,
        created_at: note.created_at ? (note.created_at instanceof Date ? note.created_at.toISOString() : note.created_at) : new Date().toISOString(),
        updated_at: note.updated_at ? (note.updated_at instanceof Date ? note.updated_at.toISOString() : note.updated_at) : new Date().toISOString(),
      }
    }, 201);
  } catch (error) {
    logger.logError(error, { context: 'createNoteFromTemplate' });
    next(error);
  }
};

/**
 * Mettre à jour un template
 */
exports.updateTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const template = await NoteTemplate.findById(id);
    if (!template) {
      return errorResponse(res, 'Template not found', 404);
    }

    if (template.created_by?.toString() !== userId.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    Object.assign(template, updates);
    await template.save();

    await logActivity(req, 'template_update', 'template', template._id);

    logger.logInfo('Template updated', { userId, template_id: id });

    return successResponse(res, { template });
  } catch (error) {
    logger.logError(error, { context: 'updateTemplate' });
    next(error);
  }
};

/**
 * Supprimer un template
 */
exports.deleteTemplate = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const template = await NoteTemplate.findById(id);
    if (!template) {
      return errorResponse(res, 'Template not found', 404);
    }

    if (template.created_by?.toString() !== userId.toString()) {
      return errorResponse(res, 'Access denied', 403);
    }

    await NoteTemplate.findByIdAndDelete(id);

    await logActivity(req, 'template_delete', 'template', id);

    logger.logInfo('Template deleted', { userId, template_id: id });

    return successResponse(res, { message: 'Template deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'deleteTemplate' });
    next(error);
  }
};





