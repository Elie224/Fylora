/**
 * Contrôleur pour le téléchargement en lot (ZIP)
 */
const archiver = require('archiver');
const path = require('path');
const fs = require('fs').promises;
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const config = require('../config');
const { successResponse, errorResponse } = require('../utils/response');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Télécharger plusieurs fichiers/dossiers en ZIP
 */
exports.downloadBatch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { file_ids = [], folder_ids = [] } = req.body;

    if (file_ids.length === 0 && folder_ids.length === 0) {
      return errorResponse(res, 'At least one file or folder ID is required', 400);
    }

    // Vérifier que tous les fichiers/dossiers appartiennent à l'utilisateur
    if (file_ids.length > 0) {
      const files = await FileModel.find({
        _id: { $in: file_ids },
        owner_id: userId,
        is_deleted: false,
      });

      if (files.length !== file_ids.length) {
        return errorResponse(res, 'Some files not found or access denied', 404);
      }
    }

    if (folder_ids.length > 0) {
      const folders = await FolderModel.find({
        _id: { $in: folder_ids },
        owner_id: userId,
        is_deleted: false,
      });

      if (folders.length !== folder_ids.length) {
        return errorResponse(res, 'Some folders not found or access denied', 404);
      }
    }

    // Configurer les en-têtes pour le téléchargement ZIP
    const zipFileName = `fylora_download_${Date.now()}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    // Créer l'archive ZIP
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Compression maximale
    });

    archive.on('error', (err) => {
      logger.logError(err, { context: 'downloadBatch archive error' });
      if (!res.headersSent) {
        errorResponse(res, 'Error creating archive', 500);
      }
    });

    archive.pipe(res);

    // Ajouter les fichiers
    for (const fileId of file_ids) {
      const file = await FileModel.findById(fileId);
      if (file) {
        const filePath = path.join(config.upload.uploadDir, `user_${userId}`, file.file_path);
        try {
          await fs.access(filePath);
          archive.file(filePath, { name: file.name });
        } catch (err) {
          logger.logWarn(`File not found on disk: ${filePath}`, { fileId });
        }
      }
    }

    // Ajouter les dossiers récursivement
    const addFolderToArchive = async (folderId, basePath = '') => {
      const folder = await FolderModel.findById(folderId);
      if (!folder) return;

      const folderPath = basePath ? `${basePath}/${folder.name}` : folder.name;

      // Ajouter les fichiers du dossier
      const files = await FileModel.find({
        folder_id: folderId,
        owner_id: userId,
        is_deleted: false,
      });

      for (const file of files) {
        const filePath = path.join(config.upload.uploadDir, `user_${userId}`, file.file_path);
        try {
          await fs.access(filePath);
          archive.file(filePath, { name: `${folderPath}/${file.name}` });
        } catch (err) {
          logger.logWarn(`File not found on disk: ${filePath}`, { fileId: file._id });
        }
      }

      // Ajouter les sous-dossiers récursivement
      const subFolders = await FolderModel.find({
        parent_id: folderId,
        owner_id: userId,
        is_deleted: false,
      });

      for (const subFolder of subFolders) {
        await addFolderToArchive(subFolder._id, folderPath);
      }
    };

    for (const folderId of folder_ids) {
      await addFolderToArchive(folderId);
    }

    // Finaliser l'archive
    await archive.finalize();

    logger.logInfo('Batch download completed', {
      userId,
      file_count: file_ids.length,
      folder_count: folder_ids.length,
    });
  } catch (error) {
    logger.logError(error, { context: 'downloadBatch' });
    if (!res.headersSent) {
      next(error);
    }
  }
};





