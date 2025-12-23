/**
 * Routes pour upload en chunks
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const { chunkedUploadMiddleware, reassembleFile } = require('../middlewares/chunkedUpload');
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const UserModel = require('../models/userModel');
const { calculateRealQuotaUsed, updateQuotaAfterOperation } = require('../utils/quota');
const { compareObjectIds } = require('../utils/objectId');
const { errorResponse, successResponse } = require('../utils/response');
const fs = require('fs').promises;

router.use(authMiddleware);

// Uploader un chunk
router.post('/chunk', chunkedUploadMiddleware, async (req, res, next) => {
  try {
    const { chunkId, chunkIndex, totalChunks, originalFilename, mimeType } = req.body;

    if (!chunkId || chunkIndex === undefined || !totalChunks || !req.file) {
      return errorResponse(res, 'Missing required fields', 400);
    }

    res.status(200).json({
      data: {
        chunkId,
        chunkIndex: parseInt(chunkIndex),
        totalChunks: parseInt(totalChunks),
        received: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Finaliser l'upload (reconstruire le fichier)
router.post('/finalize', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chunkId, originalFilename, mimeType, folder_id } = req.body;

    if (!chunkId || !originalFilename) {
      return errorResponse(res, 'Missing required fields', 400);
    }

    // Reconstruire le fichier
    const fileData = await reassembleFile(chunkId, userId, originalFilename, mimeType);

    // Vérifier le quota
    const user = await UserModel.findById(userId);
    const currentUsed = await calculateRealQuotaUsed(userId);
    const quotaLimit = user.quota_limit || 1099511627776;

    if (currentUsed + fileData.size > quotaLimit) {
      await fs.unlink(fileData.path).catch(() => {});
      return errorResponse(res, 'Insufficient storage quota', 507);
    }

    // Gérer le dossier parent
    let folderId = folder_id || null;
    if (folderId) {
      const folder = await FolderModel.findById(folderId);
      if (!folder || !compareObjectIds(folder.owner_id, userId)) {
        await fs.unlink(fileData.path).catch(() => {});
        return errorResponse(res, 'Folder not found or access denied', 404);
      }
    } else {
      let rootFolder = await FolderModel.findRootFolder(userId);
      if (!rootFolder) {
        rootFolder = await FolderModel.create({ name: 'Root', ownerId: userId, parentId: null });
      }
      folderId = rootFolder.id;
    }

    // Créer l'entrée en base de données
    const file = await FileModel.create({
      name: fileData.originalFilename,
      mimeType: fileData.mimeType || mimeType,
      size: fileData.size,
      folderId,
      ownerId: userId,
      filePath: fileData.path,
    });

    // Mettre à jour le quota
    await updateQuotaAfterOperation(userId, fileData.size);

    // Invalider le cache
    const { invalidateUserCache } = require('../utils/cache');
    invalidateUserCache(userId);

    return successResponse(res, { file }, 201);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

