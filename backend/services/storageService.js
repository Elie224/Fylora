/**
 * Service de Stockage Object (S3-compatible)
 * Gère les uploads/downloads directs avec URLs signées
 * 
 * Architecture: Le backend ne stocke JAMAIS les fichiers directement
 */

const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

// Configuration S3
let s3Client = null;
let storageType = 'local'; // 's3' | 'minio' | 'local'

/**
 * Initialiser le client S3
 */
function initS3() {
  const s3Config = {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
    signatureVersion: 'v4',
    s3ForcePathStyle: false, // true pour MinIO
  };

  const endpoint = process.env.S3_ENDPOINT || process.env.MINIO_ENDPOINT;
  const bucketName = process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'fylora-files';

  // Détecter le type de storage
  if (endpoint) {
    if (endpoint.includes('minio') || endpoint.includes('localhost')) {
      storageType = 'minio';
      s3Config.endpoint = endpoint;
      s3Config.s3ForcePathStyle = true; // MinIO nécessite path-style
    } else {
      storageType = 's3';
      s3Config.endpoint = endpoint;
    }
  } else if (s3Config.accessKeyId && s3Config.secretAccessKey) {
    storageType = 's3';
  } else {
    storageType = 'local';
    logger.logWarn('S3 not configured, using local storage (not recommended for production)');
    return null;
  }

  s3Client = new AWS.S3(s3Config);
  
  logger.logInfo('Storage service initialized', {
    type: storageType,
    bucket: bucketName,
    endpoint: endpoint || 'default'
  });

  return { s3Client, bucketName, storageType };
}

const { s3Client: initializedS3, bucketName, storageType: detectedType } = initS3() || {};
if (initializedS3) {
  s3Client = initializedS3;
  storageType = detectedType;
}

/**
 * Générer une URL signée pour upload
 * @param {string} userId - ID utilisateur
 * @param {string} fileName - Nom du fichier
 * @param {number} fileSize - Taille du fichier (bytes)
 * @param {string} mimeType - Type MIME
 * @param {number} expirationMinutes - Expiration en minutes (défaut: 60)
 * @returns {Promise<Object>} { uploadUrl, fileKey, expiresAt }
 */
async function generateUploadUrl(userId, fileName, fileSize, mimeType, expirationMinutes = 60) {
  if (!s3Client) {
    throw new Error('S3 client not initialized. Configure S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.');
  }

  // Vérifier le quota (doit être fait avant)
  // Cette vérification sera faite par le service de quota

  // Générer une clé unique pour le fichier
  const fileExtension = fileName.split('.').pop() || '';
  const fileKey = `users/${userId}/${uuidv4()}.${fileExtension}`;

  // Paramètres pour l'upload
  const params = {
    Bucket: bucketName,
    Key: fileKey,
    ContentType: mimeType,
    Metadata: {
      'original-name': encodeURIComponent(fileName),
      'user-id': userId,
      'file-size': fileSize.toString(),
    },
    // Server-side encryption
    ServerSideEncryption: 'AES256',
    // Conditions pour l'upload
    Conditions: [
      ['content-length-range', 0, fileSize], // Taille exacte
      { 'Content-Type': mimeType },
    ],
  };

  try {
    // Générer l'URL signée POST (presigned POST)
    const formData = s3Client.createPresignedPost({
      ...params,
      Expires: expirationMinutes * 60, // En secondes
    });

    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    logger.logInfo('Upload URL generated', {
      userId,
      fileName,
      fileKey,
      fileSize,
      expiresAt: expiresAt.toISOString()
    });

    return {
      uploadUrl: formData.url,
      fields: formData.fields, // Champs à inclure dans le POST
      fileKey,
      expiresAt: expiresAt.toISOString(),
      method: 'POST',
    };
  } catch (error) {
    logger.logError(error, { context: 'generate_upload_url', userId, fileName });
    throw new Error('Failed to generate upload URL');
  }
}

/**
 * Générer une URL signée pour download
 * @param {string} fileKey - Clé S3 du fichier
 * @param {string} fileName - Nom du fichier pour Content-Disposition
 * @param {number} expirationMinutes - Expiration en minutes (défaut: 15)
 * @returns {Promise<Object>} { downloadUrl, expiresAt }
 */
async function generateDownloadUrl(fileKey, fileName, expirationMinutes = 15) {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }

  const params = {
    Bucket: bucketName,
    Key: fileKey,
    ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    // Expiration courte pour sécurité
    Expires: expirationMinutes * 60,
  };

  try {
    const downloadUrl = s3Client.getSignedUrl('getObject', params);
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    logger.logInfo('Download URL generated', {
      fileKey,
      fileName,
      expiresAt: expiresAt.toISOString()
    });

    return {
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
      method: 'GET',
    };
  } catch (error) {
    logger.logError(error, { context: 'generate_download_url', fileKey });
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Générer une URL signée pour prévisualisation (stream)
 * @param {string} fileKey - Clé S3 du fichier
 * @param {string} mimeType - Type MIME
 * @param {number} expirationMinutes - Expiration en minutes (défaut: 15)
 * @returns {Promise<Object>} { previewUrl, expiresAt }
 */
async function generatePreviewUrl(fileKey, mimeType, expirationMinutes = 15) {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }

  const params = {
    Bucket: bucketName,
    Key: fileKey,
    ResponseContentType: mimeType,
    // Headers pour streaming
    ResponseCacheControl: 'public, max-age=3600',
    Expires: expirationMinutes * 60,
  };

  try {
    const previewUrl = s3Client.getSignedUrl('getObject', params);
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    return {
      previewUrl,
      expiresAt: expiresAt.toISOString(),
      method: 'GET',
    };
  } catch (error) {
    logger.logError(error, { context: 'generate_preview_url', fileKey });
    throw new Error('Failed to generate preview URL');
  }
}

/**
 * Vérifier si un fichier existe dans S3
 * @param {string} fileKey - Clé S3 du fichier
 * @returns {Promise<boolean>}
 */
async function fileExists(fileKey) {
  if (!s3Client) {
    return false;
  }

  try {
    await s3Client.headObject({
      Bucket: bucketName,
      Key: fileKey,
    }).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    logger.logError(error, { context: 'file_exists_check', fileKey });
    return false;
  }
}

/**
 * Supprimer un fichier de S3
 * @param {string} fileKey - Clé S3 du fichier
 * @returns {Promise<boolean>}
 */
async function deleteFile(fileKey) {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }

  try {
    await s3Client.deleteObject({
      Bucket: bucketName,
      Key: fileKey,
    }).promise();
    
    logger.logInfo('File deleted from S3', { fileKey });
    return true;
  } catch (error) {
    logger.logError(error, { context: 'delete_file_s3', fileKey });
    throw new Error('Failed to delete file from S3');
  }
}

/**
 * Obtenir les métadonnées d'un fichier
 * @param {string} fileKey - Clé S3 du fichier
 * @returns {Promise<Object>} { size, contentType, lastModified, etag }
 */
async function getFileMetadata(fileKey) {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }

  try {
    const head = await s3Client.headObject({
      Bucket: bucketName,
      Key: fileKey,
    }).promise();

    return {
      size: head.ContentLength,
      contentType: head.ContentType,
      lastModified: head.LastModified,
      etag: head.ETag,
      metadata: head.Metadata,
    };
  } catch (error) {
    logger.logError(error, { context: 'get_file_metadata', fileKey });
    throw new Error('Failed to get file metadata');
  }
}

/**
 * Générer une URL signée pour upload chunké (multipart)
 * @param {string} userId - ID utilisateur
 * @param {string} fileName - Nom du fichier
 * @param {number} fileSize - Taille totale
 * @param {string} mimeType - Type MIME
 * @returns {Promise<Object>} { uploadId, fileKey }
 */
async function initiateMultipartUpload(userId, fileName, fileSize, mimeType) {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }

  const fileExtension = fileName.split('.').pop() || '';
  const fileKey = `users/${userId}/${uuidv4()}.${fileExtension}`;

  const params = {
    Bucket: bucketName,
    Key: fileKey,
    ContentType: mimeType,
    Metadata: {
      'original-name': encodeURIComponent(fileName),
      'user-id': userId,
      'file-size': fileSize.toString(),
    },
    ServerSideEncryption: 'AES256',
  };

  try {
    const result = await s3Client.createMultipartUpload(params).promise();
    
    logger.logInfo('Multipart upload initiated', {
      userId,
      fileName,
      fileKey,
      uploadId: result.UploadId
    });

    return {
      uploadId: result.UploadId,
      fileKey,
    };
  } catch (error) {
    logger.logError(error, { context: 'initiate_multipart_upload', userId, fileName });
    throw new Error('Failed to initiate multipart upload');
  }
}

/**
 * Générer une URL signée pour upload d'un chunk
 * @param {string} fileKey - Clé S3
 * @param {string} uploadId - ID de l'upload multipart
 * @param {number} partNumber - Numéro du chunk (1-indexed)
 * @param {number} chunkSize - Taille du chunk
 * @returns {Promise<Object>} { uploadUrl, expiresAt }
 */
async function generateChunkUploadUrl(fileKey, uploadId, partNumber, chunkSize) {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }

  const params = {
    Bucket: bucketName,
    Key: fileKey,
    UploadId: uploadId,
    PartNumber: partNumber,
    ContentLength: chunkSize,
    Expires: 3600, // 1 heure
  };

  try {
    const uploadUrl = s3Client.getSignedUrl('uploadPart', params);
    const expiresAt = new Date(Date.now() + 3600 * 1000);

    return {
      uploadUrl,
      expiresAt: expiresAt.toISOString(),
      partNumber,
    };
  } catch (error) {
    logger.logError(error, { context: 'generate_chunk_upload_url', fileKey, uploadId, partNumber });
    throw new Error('Failed to generate chunk upload URL');
  }
}

/**
 * Finaliser l'upload multipart
 * @param {string} fileKey - Clé S3
 * @param {string} uploadId - ID de l'upload multipart
 * @param {Array} parts - Array de { ETag, PartNumber }
 * @returns {Promise<Object>} { location, etag }
 */
async function completeMultipartUpload(fileKey, uploadId, parts) {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }

  const params = {
    Bucket: bucketName,
    Key: fileKey,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map(p => ({
        ETag: p.etag,
        PartNumber: p.partNumber,
      })),
    },
  };

  try {
    const result = await s3Client.completeMultipartUpload(params).promise();
    
    logger.logInfo('Multipart upload completed', {
      fileKey,
      uploadId,
      location: result.Location
    });

    return {
      location: result.Location,
      etag: result.ETag,
    };
  } catch (error) {
    logger.logError(error, { context: 'complete_multipart_upload', fileKey, uploadId });
    throw new Error('Failed to complete multipart upload');
  }
}

/**
 * Annuler un upload multipart
 * @param {string} fileKey - Clé S3
 * @param {string} uploadId - ID de l'upload multipart
 */
async function abortMultipartUpload(fileKey, uploadId) {
  if (!s3Client) {
    return;
  }

  try {
    await s3Client.abortMultipartUpload({
      Bucket: bucketName,
      Key: fileKey,
      UploadId: uploadId,
    }).promise();
    
    logger.logInfo('Multipart upload aborted', { fileKey, uploadId });
  } catch (error) {
    logger.logError(error, { context: 'abort_multipart_upload', fileKey, uploadId });
  }
}

/**
 * Vérifier si le storage est configuré
 */
function isStorageConfigured() {
  return s3Client !== null && storageType !== 'local';
}

/**
 * Obtenir le type de storage
 */
function getStorageType() {
  return storageType;
}

module.exports = {
  // Initialisation
  initS3,
  isStorageConfigured,
  getStorageType,
  
  // URLs signées
  generateUploadUrl,
  generateDownloadUrl,
  generatePreviewUrl,
  
  // Opérations fichiers
  fileExists,
  deleteFile,
  getFileMetadata,
  
  // Upload multipart (chunké)
  initiateMultipartUpload,
  generateChunkUploadUrl,
  completeMultipartUpload,
  abortMultipartUpload,
  
  // Configuration
  bucketName: bucketName || 'fylora-files',
  storageType,
};

