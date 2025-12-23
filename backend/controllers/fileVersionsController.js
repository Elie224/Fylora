/**
 * Contrôleur pour gérer les versions de fichiers
 */
const FileVersion = require('../models/FileVersion');
const FileModel = require('../models/fileModel');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { successResponse, errorResponse } = require('../utils/response');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Créer une nouvelle version d'un fichier
 */
exports.createVersion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { file_id } = req.params;

    // Vérifier que le fichier existe et appartient à l'utilisateur
    const file = await FileModel.findOne({ _id: file_id, owner_id: userId, is_deleted: false });
    if (!file) {
      return errorResponse(res, 'File not found or access denied', 404);
    }

    // Marquer toutes les versions précédentes comme non courantes
    await FileVersion.updateMany(
      { file_id, is_current: true },
      { is_current: false }
    );

    // Créer une copie du fichier actuel
    const sourcePath = path.join(config.upload.uploadDir, `user_${userId}`, file.file_path);
    const versionDir = path.join(config.upload.uploadDir, `user_${userId}`, 'versions', file_id);
    await fs.mkdir(versionDir, { recursive: true });

    // Obtenir le numéro de version suivant
    const lastVersion = await FileVersion.findOne({ file_id })
      .sort({ version_number: -1 });
    const versionNumber = lastVersion ? lastVersion.version_number + 1 : 1;

    const versionFileName = `v${versionNumber}_${path.basename(file.file_path)}`;
    const versionPath = path.join(versionDir, versionFileName);

    // Copier le fichier
    await fs.copyFile(sourcePath, versionPath);

    // Créer l'enregistrement de version
    const version = await FileVersion.create({
      file_id,
      version_number: versionNumber,
      file_path: path.join('versions', file_id, versionFileName),
      size: file.size,
      mime_type: file.mime_type,
      created_by: userId,
      is_current: false,
    });

    logger.logInfo('File version created', { userId, file_id, versionNumber });

    return successResponse(res, { version }, 201);
  } catch (error) {
    logger.logError(error, { context: 'createVersion' });
    next(error);
  }
};

/**
 * Lister les versions d'un fichier
 */
exports.listVersions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { file_id } = req.params;

    // Vérifier que le fichier existe et appartient à l'utilisateur
    const file = await FileModel.findOne({ _id: file_id, owner_id: userId, is_deleted: false });
    if (!file) {
      return errorResponse(res, 'File not found or access denied', 404);
    }

    const versions = await FileVersion.find({ file_id })
      .sort({ version_number: -1 })
      .populate('created_by', 'email display_name');

    return successResponse(res, {
      file_id,
      versions,
      total: versions.length,
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
    const { file_id, version_id } = req.params;

    // Vérifier que le fichier existe et appartient à l'utilisateur
    const file = await FileModel.findOne({ _id: file_id, owner_id: userId, is_deleted: false });
    if (!file) {
      return errorResponse(res, 'File not found or access denied', 404);
    }

    // Vérifier que la version existe
    const version = await FileVersion.findOne({ _id: version_id, file_id });
    if (!version) {
      return errorResponse(res, 'Version not found', 404);
    }

    // Créer une nouvelle version du fichier actuel avant restauration
    await exports.createVersion({ user: { id: userId }, params: { file_id } }, res, () => {});

    // Restaurer la version
    const versionPath = path.join(config.upload.uploadDir, `user_${userId}`, version.file_path);
    const currentPath = path.join(config.upload.uploadDir, `user_${userId}`, file.file_path);

    // Copier la version vers le fichier actuel
    await fs.copyFile(versionPath, currentPath);

    // Mettre à jour le fichier
    file.size = version.size;
    file.mime_type = version.mime_type;
    file.updated_at = new Date();
    await file.save();

    // Marquer cette version comme courante
    await FileVersion.updateMany(
      { file_id },
      { is_current: false }
    );
    version.is_current = true;
    await version.save();

    logger.logInfo('File version restored', { userId, file_id, version_id });

    return successResponse(res, {
      message: 'Version restored successfully',
      file,
      version,
    });
  } catch (error) {
    logger.logError(error, { context: 'restoreVersion' });
    next(error);
  }
};

/**
 * Télécharger une version spécifique
 */
exports.downloadVersion = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { file_id, version_id } = req.params;

    // Vérifier que le fichier existe et appartient à l'utilisateur
    const file = await FileModel.findOne({ _id: file_id, owner_id: userId, is_deleted: false });
    if (!file) {
      return errorResponse(res, 'File not found or access denied', 404);
    }

    // Vérifier que la version existe
    const version = await FileVersion.findOne({ _id: version_id, file_id });
    if (!version) {
      return errorResponse(res, 'Version not found', 404);
    }

    const versionPath = path.join(config.upload.uploadDir, `user_${userId}`, version.file_path);

    // Vérifier que le fichier existe
    try {
      await fs.access(versionPath);
    } catch {
      return errorResponse(res, 'Version file not found on disk', 404);
    }

    res.setHeader('Content-Type', version.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}_v${version.version_number}${path.extname(file.name)}"`);
    res.setHeader('Content-Length', version.size);

    const fileStream = require('fs').createReadStream(versionPath);
    fileStream.pipe(res);
  } catch (error) {
    logger.logError(error, { context: 'downloadVersion' });
    next(error);
  }
};





