/**
 * Contrôleur pour batch requests
 * Permet de faire plusieurs opérations en une seule requête
 */
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Batch operations pour fichiers
 */
async function batchFiles(req, res, next) {
  try {
    const userId = req.user.id;
    const { operations } = req.body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return errorResponse(res, 'Operations array is required', 400);
    }

    if (operations.length > 100) {
      return errorResponse(res, 'Maximum 100 operations per batch', 400);
    }

    const results = [];
    const errors = [];

    // Traiter les opérations en parallèle (avec limite)
    const batchSize = 10; // Traiter 10 opérations en parallèle
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(async (op) => {
          return await processFileOperation(userId, op);
        })
      );

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push({
            operation: batch[index],
            result: result.value,
          });
        } else {
          errors.push({
            operation: batch[index],
            error: result.reason.message,
          });
        }
      });
    }

    res.status(200).json({
      data: {
        results,
        errors,
        total: operations.length,
        success: results.length,
        failed: errors.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Traiter une opération sur fichier
 */
async function processFileOperation(userId, operation) {
  const { action, fileId, data } = operation;

  switch (action) {
    case 'delete':
      const file = await FileModel.findById(fileId);
      if (!file || file.owner_id.toString() !== userId) {
        throw new Error('File not found or access denied');
      }
      await FileModel.softDelete(fileId);
      return { action: 'delete', fileId, success: true };

    case 'move':
      const fileToMove = await FileModel.findById(fileId);
      if (!fileToMove || fileToMove.owner_id.toString() !== userId) {
        throw new Error('File not found or access denied');
      }
      await FileModel.update(fileId, { folder_id: data.folderId });
      return { action: 'move', fileId, success: true };

    case 'rename':
      const fileToRename = await FileModel.findById(fileId);
      if (!fileToRename || fileToRename.owner_id.toString() !== userId) {
        throw new Error('File not found or access denied');
      }
      await FileModel.update(fileId, { name: data.name });
      return { action: 'rename', fileId, success: true };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

/**
 * Batch operations pour dossiers
 */
async function batchFolders(req, res, next) {
  try {
    const userId = req.user.id;
    const { operations } = req.body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return errorResponse(res, 'Operations array is required', 400);
    }

    const results = [];
    const errors = [];

    for (const op of operations) {
      try {
        const result = await processFolderOperation(userId, op);
        results.push({ operation: op, result });
      } catch (error) {
        errors.push({ operation: op, error: error.message });
      }
    }

    res.status(200).json({
      data: {
        results,
        errors,
        total: operations.length,
        success: results.length,
        failed: errors.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function processFolderOperation(userId, operation) {
  const { action, folderId, data } = operation;

  switch (action) {
    case 'delete':
      const folder = await FolderModel.findById(folderId);
      if (!folder || folder.owner_id.toString() !== userId) {
        throw new Error('Folder not found or access denied');
      }
      await FolderModel.softDelete(folderId);
      return { action: 'delete', folderId, success: true };

    case 'move':
      const folderToMove = await FolderModel.findById(folderId);
      if (!folderToMove || folderToMove.owner_id.toString() !== userId) {
        throw new Error('Folder not found or access denied');
      }
      await FolderModel.update(folderId, { parent_id: data.parentId });
      return { action: 'move', folderId, success: true };

    case 'rename':
      const folderToRename = await FolderModel.findById(folderId);
      if (!folderToRename || folderToRename.owner_id.toString() !== userId) {
        throw new Error('Folder not found or access denied');
      }
      await FolderModel.update(folderId, { name: data.name });
      return { action: 'rename', folderId, success: true };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

module.exports = {
  batchFiles,
  batchFolders,
};


