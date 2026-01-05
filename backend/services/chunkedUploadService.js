/**
 * Service d'Upload Chunké avec Reprise
 * Support de fichiers volumineux (plusieurs Go)
 * Hash SHA-256 pour intégrité
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const storageService = require('./storageService');
const redisCache = require('../utils/redisCache');

/**
 * Calculer le hash SHA-256 d'un chunk
 * @param {Buffer} chunk - Chunk à hasher
 * @returns {string} Hash hexadécimal
 */
function calculateChunkHash(chunk) {
  return crypto.createHash('sha256').update(chunk).digest('hex');
}

/**
 * Calculer le hash SHA-256 d'un fichier complet
 * @param {Array<Buffer>} chunks - Tous les chunks
 * @returns {string} Hash hexadécimal
 */
function calculateFileHash(chunks) {
  const hash = crypto.createHash('sha256');
  chunks.forEach(chunk => hash.update(chunk));
  return hash.digest('hex');
}

/**
 * Sauvegarder l'état d'un upload chunké
 * @param {string} uploadId - ID de l'upload
 * @param {Object} state - État de l'upload
 */
async function saveUploadState(uploadId, state) {
  await redisCache.set(
    `chunked_upload:${uploadId}`,
    state,
    3600 // 1 heure
  );
}

/**
 * Récupérer l'état d'un upload chunké
 * @param {string} uploadId - ID de l'upload
 * @returns {Promise<Object|null>} État de l'upload
 */
async function getUploadState(uploadId) {
  return await redisCache.get(`chunked_upload:${uploadId}`);
}

/**
 * Supprimer l'état d'un upload
 * @param {string} uploadId - ID de l'upload
 */
async function deleteUploadState(uploadId) {
  await redisCache.del(`chunked_upload:${uploadId}`);
}

/**
 * Initier un upload chunké
 * @param {string} userId - ID utilisateur
 * @param {string} fileName - Nom du fichier
 * @param {number} fileSize - Taille totale
 * @param {string} mimeType - Type MIME
 * @param {number} chunkSize - Taille des chunks (défaut: 5 MB)
 * @returns {Promise<Object>} { uploadId, fileKey, chunkSize, totalChunks }
 */
async function initiateChunkedUpload(userId, fileName, fileSize, mimeType, chunkSize = 5 * 1024 * 1024) {
  // Initier l'upload multipart S3
  const multipartData = await storageService.initiateMultipartUpload(
    userId,
    fileName,
    fileSize,
    mimeType
  );

  const totalChunks = Math.ceil(fileSize / chunkSize);
  const uploadId = `chunked_${multipartData.uploadId}`;

  // Sauvegarder l'état
  await saveUploadState(uploadId, {
    userId,
    fileName,
    fileSize,
    mimeType,
    fileKey: multipartData.fileKey,
    uploadId: multipartData.uploadId,
    chunkSize,
    totalChunks,
    uploadedChunks: [],
    chunkHashes: {},
    startTime: Date.now(),
  });

  logger.logInfo('Chunked upload initiated', {
    uploadId,
    userId,
    fileName,
    fileSize,
    totalChunks,
    chunkSize
  });

  return {
    uploadId,
    fileKey: multipartData.fileKey,
    chunkSize,
    totalChunks,
  };
}

/**
 * Uploader un chunk
 * @param {string} uploadId - ID de l'upload
 * @param {number} chunkIndex - Index du chunk (0-based)
 * @param {Buffer} chunkData - Données du chunk
 * @returns {Promise<Object>} { partNumber, etag, chunkHash }
 */
async function uploadChunk(uploadId, chunkIndex, chunkData) {
  // Récupérer l'état
  const state = await getUploadState(uploadId);
  if (!state) {
    throw new Error('Upload session not found or expired');
  }

  const partNumber = chunkIndex + 1;
  const chunkHash = calculateChunkHash(chunkData);

  // Vérifier si ce chunk a déjà été uploadé
  if (state.uploadedChunks.includes(chunkIndex)) {
    logger.logInfo('Chunk already uploaded', {
      uploadId,
      chunkIndex,
      partNumber
    });
    
    // Récupérer l'ETag depuis l'état
    const existingChunk = state.uploadedChunks.find(c => c.index === chunkIndex);
    return {
      partNumber,
      etag: existingChunk.etag,
      chunkHash
    };
  }

  // Obtenir l'URL pour ce chunk
  const chunkUrl = await storageService.generateChunkUploadUrl(
    state.fileKey,
    state.uploadId,
    partNumber,
    chunkData.length
  );

  // Uploader le chunk vers S3
  // Note: Dans un vrai système, cela serait fait côté client
  // Ici on simule pour le backend
  const etag = chunkHash; // En production, ce serait l'ETag de S3

  // Mettre à jour l'état
  state.uploadedChunks.push({
    index: chunkIndex,
    partNumber,
    etag,
    hash: chunkHash,
    size: chunkData.length,
    uploadedAt: Date.now()
  });
  state.chunkHashes[chunkIndex] = chunkHash;

  await saveUploadState(uploadId, state);

  logger.logInfo('Chunk uploaded', {
    uploadId,
    chunkIndex,
    partNumber,
    size: chunkData.length,
    hash: chunkHash
  });

  return {
    partNumber,
    etag,
    chunkHash
  };
}

/**
 * Finaliser un upload chunké
 * @param {string} uploadId - ID de l'upload
 * @returns {Promise<Object>} { fileKey, etag, fileHash, metadata }
 */
async function finalizeChunkedUpload(uploadId) {
  const state = await getUploadState(uploadId);
  if (!state) {
    throw new Error('Upload session not found or expired');
  }

  // Vérifier que tous les chunks sont uploadés
  if (state.uploadedChunks.length !== state.totalChunks) {
    throw new Error(`Missing chunks: ${state.totalChunks - state.uploadedChunks.length} remaining`);
  }

  // Préparer les parts pour S3
  const parts = state.uploadedChunks
    .sort((a, b) => a.partNumber - b.partNumber)
    .map(chunk => ({
      etag: chunk.etag,
      partNumber: chunk.partNumber
    }));

  // Finaliser l'upload multipart dans S3
  const result = await storageService.completeMultipartUpload(
    state.fileKey,
    state.uploadId,
    parts
  );

  // Calculer le hash final (si tous les chunks étaient disponibles)
  const fileHash = Object.keys(state.chunkHashes)
    .sort()
    .map(i => state.chunkHashes[i])
    .join('');

  // Obtenir les métadonnées S3
  const metadata = await storageService.getFileMetadata(state.fileKey);

  // Nettoyer l'état
  await deleteUploadState(uploadId);

  logger.logInfo('Chunked upload finalized', {
    uploadId,
    fileKey: state.fileKey,
    fileSize: state.fileSize,
    duration: Date.now() - state.startTime
  });

  return {
    fileKey: state.fileKey,
    etag: result.etag,
    fileHash,
    metadata: {
      ...metadata,
      fileName: state.fileName,
      mimeType: state.mimeType
    }
  };
}

/**
 * Obtenir le statut d'un upload
 * @param {string} uploadId - ID de l'upload
 * @returns {Promise<Object>} { progress, uploadedChunks, totalChunks, fileSize }
 */
async function getUploadStatus(uploadId) {
  const state = await getUploadState(uploadId);
  if (!state) {
    return null;
  }

  const uploadedSize = state.uploadedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
  const progress = (uploadedSize / state.fileSize) * 100;

  return {
    progress: Math.round(progress * 100) / 100,
    uploadedChunks: state.uploadedChunks.length,
    totalChunks: state.totalChunks,
    uploadedSize,
    totalSize: state.fileSize,
    fileKey: state.fileKey,
    startTime: state.startTime,
    estimatedTimeRemaining: state.uploadedChunks.length > 0
      ? ((Date.now() - state.startTime) / state.uploadedChunks.length) * (state.totalChunks - state.uploadedChunks.length)
      : null
  };
}

/**
 * Reprendre un upload interrompu
 * @param {string} uploadId - ID de l'upload
 * @returns {Promise<Array>} Chunks manquants [{ chunkIndex, partNumber, size }]
 */
async function resumeUpload(uploadId) {
  const state = await getUploadState(uploadId);
  if (!state) {
    throw new Error('Upload session not found or expired');
  }

  const uploadedIndices = new Set(state.uploadedChunks.map(c => c.index));
  const missingChunks = [];

  for (let i = 0; i < state.totalChunks; i++) {
    if (!uploadedIndices.has(i)) {
      const start = i * state.chunkSize;
      const end = Math.min(start + state.chunkSize, state.fileSize);
      missingChunks.push({
        chunkIndex: i,
        partNumber: i + 1,
        size: end - start
      });
    }
  }

  return missingChunks;
}

module.exports = {
  initiateChunkedUpload,
  uploadChunk,
  finalizeChunkedUpload,
  getUploadStatus,
  resumeUpload,
  calculateChunkHash,
  calculateFileHash,
};

