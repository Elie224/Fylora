/**
 * Contrôleur pour gérer les tags
 */
const Tag = require('../models/Tag');
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const { successResponse, errorResponse } = require('../utils/response');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');
const { invalidateUserCache } = require('../utils/cache');

/**
 * Créer un tag
 */
exports.createTag = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, color } = req.body;

    if (!name || name.trim().length === 0) {
      return errorResponse(res, 'Tag name is required', 400);
    }

    if (name.length > 50) {
      return errorResponse(res, 'Tag name must be less than 50 characters', 400);
    }

    const tag = await Tag.create({
      name: name.trim(),
      color: color || '#2196F3',
      user_id: userId,
    });

    logger.logInfo('Tag created', { userId, tag_id: tag._id });

    // Invalider le cache des tags
    invalidateUserCache(userId);

    return successResponse(res, { tag }, 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Tag already exists', 400);
    }
    logger.logError(error, { context: 'createTag' });
    next(error);
  }
};

/**
 * Lister les tags de l'utilisateur
 */
exports.listTags = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Utiliser .lean() pour améliorer les performances
    const tags = await Tag.find({ user_id: userId })
      .sort({ name: 1 })
      .lean()
      .select('name color file_ids folder_ids created_at updated_at');

    return successResponse(res, {
      tags,
      total: tags.length,
    });
  } catch (error) {
    logger.logError(error, { context: 'listTags' });
    next(error);
  }
};

/**
 * Ajouter des tags à un fichier ou dossier
 */
exports.addTagsToResource = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { resource_id } = req.params;
    const { tag_ids, resource_type } = req.body;

    if (!tag_ids || !Array.isArray(tag_ids) || tag_ids.length === 0) {
      return errorResponse(res, 'tag_ids array is required', 400);
    }

    if (!resource_type || !['file', 'folder'].includes(resource_type)) {
      return errorResponse(res, 'resource_type must be "file" or "folder"', 400);
    }

    // Vérifier que les tags appartiennent à l'utilisateur
    const tags = await Tag.find({
      _id: { $in: tag_ids },
      user_id: userId,
    });

    if (tags.length !== tag_ids.length) {
      return errorResponse(res, 'Some tags not found or access denied', 404);
    }

    // Vérifier que la ressource existe et appartient à l'utilisateur
    if (resource_type === 'file') {
      const file = await FileModel.findOne({ _id: resource_id, owner_id: userId });
      if (!file) {
        return errorResponse(res, 'File not found or access denied', 404);
      }
    } else {
      const folder = await FolderModel.findOne({ _id: resource_id, owner_id: userId });
      if (!folder) {
        return errorResponse(res, 'Folder not found or access denied', 404);
      }
    }

    // Ajouter la ressource aux tags
    const updateField = resource_type === 'file' ? 'file_ids' : 'folder_ids';
    await Tag.updateMany(
      { _id: { $in: tag_ids } },
      { $addToSet: { [updateField]: resource_id } }
    );

    logger.logInfo('Tags added to resource', { userId, resource_id, resource_type, tag_ids });

    return successResponse(res, {
      message: 'Tags added successfully',
      tags,
    });
  } catch (error) {
    logger.logError(error, { context: 'addTagsToResource' });
    next(error);
  }
};

/**
 * Retirer des tags d'une ressource
 */
exports.removeTagsFromResource = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { resource_id } = req.params;
    const { tag_ids, resource_type } = req.body;

    if (!tag_ids || !Array.isArray(tag_ids)) {
      return errorResponse(res, 'tag_ids array is required', 400);
    }

    if (!resource_type || !['file', 'folder'].includes(resource_type)) {
      return errorResponse(res, 'resource_type must be "file" or "folder"', 400);
    }

    // Retirer la ressource des tags
    const updateField = resource_type === 'file' ? 'file_ids' : 'folder_ids';
    await Tag.updateMany(
      { _id: { $in: tag_ids }, user_id: userId },
      { $pull: { [updateField]: resource_id } }
    );

    logger.logInfo('Tags removed from resource', { userId, resource_id, resource_type, tag_ids });

    return successResponse(res, {
      message: 'Tags removed successfully',
    });
  } catch (error) {
    logger.logError(error, { context: 'removeTagsFromResource' });
    next(error);
  }
};

/**
 * Mettre à jour un tag
 */
exports.updateTag = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, color } = req.body;

    const tag = await Tag.findOne({ _id: id, user_id: userId });
    if (!tag) {
      return errorResponse(res, 'Tag not found or access denied', 404);
    }

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return errorResponse(res, 'Tag name cannot be empty', 400);
      }
      tag.name = name.trim();
    }

    if (color !== undefined) {
      tag.color = color;
    }

    await tag.save();

    logger.logInfo('Tag updated', { userId, tag_id: id });

    // Invalider le cache des tags
    invalidateUserCache(userId);

    return successResponse(res, { tag });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'Tag name already exists', 400);
    }
    logger.logError(error, { context: 'updateTag' });
    next(error);
  }
};

/**
 * Supprimer un tag
 */
exports.deleteTag = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const tag = await Tag.findOneAndDelete({ _id: id, user_id: userId });
    if (!tag) {
      return errorResponse(res, 'Tag not found or access denied', 404);
    }

    logger.logInfo('Tag deleted', { userId, tag_id: id });

    // Invalider le cache des tags
    invalidateUserCache(userId);

    return successResponse(res, {
      message: 'Tag deleted successfully',
    });
  } catch (error) {
    logger.logError(error, { context: 'deleteTag' });
    next(error);
  }
};

/**
 * Obtenir les fichiers/dossiers avec un tag spécifique
 */
exports.getResourcesByTag = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const tag = await Tag.findOne({ _id: id, user_id: userId });
    if (!tag) {
      return errorResponse(res, 'Tag not found or access denied', 404);
    }

    const files = await FileModel.find({
      _id: { $in: tag.file_ids },
      owner_id: userId,
      is_deleted: false,
    });

    const folders = await FolderModel.find({
      _id: { $in: tag.folder_ids },
      owner_id: userId,
      is_deleted: false,
    });

    return successResponse(res, {
      tag,
      files,
      folders,
      total: files.length + folders.length,
    });
  } catch (error) {
    logger.logError(error, { context: 'getResourcesByTag' });
    next(error);
  }
};


