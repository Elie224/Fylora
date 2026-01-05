/**
 * Service de Métadonnées de Fichiers
 * Gère les métadonnées dans MongoDB (pas les fichiers eux-mêmes)
 * 
 * Architecture: Séparation stricte métadonnées / fichiers
 */

const mongoose = require('mongoose');
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const logger = require('../utils/logger');
const { compareObjectIds } = require('../utils/objectId');

/**
 * Créer une entrée de métadonnées après upload S3
 * @param {Object} fileData - { name, mimeType, size, folderId, ownerId, fileKey, etag }
 * @returns {Promise<Object>} Fichier créé
 */
async function createFileMetadata(fileData) {
  const { name, mimeType, size, folderId, ownerId, fileKey, etag } = fileData;

  try {
    // Créer le fichier avec fileKey (clé S3) au lieu de filePath local
    const file = await FileModel.create({
      name,
      mimeType,
      size,
      folderId: folderId || null,
      ownerId,
      filePath: fileKey, // Stocker la clé S3
      // Métadonnées supplémentaires
      s3_key: fileKey,
      s3_etag: etag,
      storage_type: 's3',
    });

    logger.logInfo('File metadata created', {
      fileId: file.id,
      name,
      size,
      fileKey,
      ownerId
    });

    return file;
  } catch (error) {
    logger.logError(error, { context: 'create_file_metadata', fileData });
    throw error;
  }
}

/**
 * Obtenir les métadonnées d'un fichier
 * @param {string} fileId - ID du fichier
 * @param {string} userId - ID utilisateur (pour vérification permissions)
 * @returns {Promise<Object>} Métadonnées du fichier
 */
async function getFileMetadata(fileId, userId) {
  const file = await FileModel.findById(fileId);
  
  if (!file) {
    throw new Error('File not found');
  }

  // Vérifier les permissions
  if (!compareObjectIds(file.owner_id, userId)) {
    throw new Error('Access denied');
  }

  return file;
}

/**
 * Mettre à jour les métadonnées d'un fichier
 * @param {string} fileId - ID du fichier
 * @param {string} userId - ID utilisateur
 * @param {Object} updates - { name?, folderId? }
 * @returns {Promise<Object>} Fichier mis à jour
 */
async function updateFileMetadata(fileId, userId, updates) {
  const file = await FileModel.findById(fileId);
  
  if (!file) {
    throw new Error('File not found');
  }

  // Vérifier les permissions
  if (!compareObjectIds(file.owner_id, userId)) {
    throw new Error('Access denied');
  }

  const updated = await FileModel.update(fileId, updates);
  
  logger.logInfo('File metadata updated', {
    fileId,
    userId,
    updates
  });

  return updated;
}

/**
 * Supprimer les métadonnées d'un fichier (soft delete)
 * @param {string} fileId - ID du fichier
 * @param {string} userId - ID utilisateur
 * @returns {Promise<Object>} Fichier supprimé
 */
async function deleteFileMetadata(fileId, userId) {
  const file = await FileModel.findById(fileId);
  
  if (!file) {
    throw new Error('File not found');
  }

  // Vérifier les permissions
  if (!compareObjectIds(file.owner_id, userId)) {
    throw new Error('Access denied');
  }

  // Soft delete
  await FileModel.softDelete(fileId);
  
  logger.logInfo('File metadata deleted', {
    fileId,
    userId,
    fileKey: file.s3_key || file.file_path
  });

  return file;
}

/**
 * Lister les fichiers d'un utilisateur
 * @param {string} userId - ID utilisateur
 * @param {Object} options - { folderId?, skip?, limit?, sortBy?, sortOrder? }
 * @returns {Promise<Object>} { files, total, pagination }
 */
async function listUserFiles(userId, options = {}) {
  const {
    folderId = null,
    skip = 0,
    limit = 50,
    sortBy = 'name',
    sortOrder = 'asc'
  } = options;

  const files = await FileModel.findByOwner(userId, folderId, false, {
    skip: parseInt(skip),
    limit: Math.min(parseInt(limit), 100),
    sortBy,
    sortOrder
  });

  return {
    files,
    pagination: {
      skip: parseInt(skip),
      limit: parseInt(limit),
      total: files.length // Approximation, pas de count pour performance
    }
  };
}

/**
 * Obtenir la clé S3 d'un fichier
 * @param {string} fileId - ID du fichier
 * @returns {Promise<string>} Clé S3
 */
async function getFileS3Key(fileId) {
  const file = await FileModel.findById(fileId);
  
  if (!file) {
    throw new Error('File not found');
  }

  // Priorité: s3_key > file_path
  return file.s3_key || file.file_path;
}

module.exports = {
  createFileMetadata,
  getFileMetadata,
  updateFileMetadata,
  deleteFileMetadata,
  listUserFiles,
  getFileS3Key,
};

