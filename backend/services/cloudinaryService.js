/**
 * Service Cloudinary pour Stockage de Fichiers
 * Alternative simple à AWS S3 - Optimisation automatique des images/vidéos
 */

const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Configuration Cloudinary
let isConfigured = false;

function initCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    logger.logWarn('Cloudinary not configured, using local storage');
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  isConfigured = true;
  logger.logInfo('Cloudinary service initialized', { cloudName });
  return true;
}

// Initialiser au chargement
initCloudinary();

/**
 * Uploader un fichier vers Cloudinary
 * @param {Buffer} fileBuffer - Contenu du fichier
 * @param {string} fileName - Nom original du fichier
 * @param {string} userId - ID utilisateur
 * @param {string} mimeType - Type MIME
 * @returns {Promise<Object>} { fileKey, url, size, format }
 */
async function uploadFile(fileBuffer, fileName, userId, mimeType) {
  if (!isConfigured) {
    throw new Error('Cloudinary not configured');
  }

  // Déterminer le type de ressource
  let resourceType = 'auto'; // Détecte automatiquement
  if (mimeType?.startsWith('image/')) {
    resourceType = 'image';
  } else if (mimeType?.startsWith('video/')) {
    resourceType = 'video';
  } else {
    resourceType = 'raw'; // Documents, PDFs, etc.
  }

  // Générer un nom unique
  const fileExtension = fileName.split('.').pop() || '';
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const folder = `fylora/users/${userId}`;
  // Ne pas inclure le folder dans public_id, Cloudinary le gère automatiquement
  const publicId = uniqueFileName.replace(/\.[^/.]+$/, '');

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: publicId,
        resource_type: resourceType,
        // Optimisation automatique
        quality: 'auto',
        fetch_format: 'auto',
        // Métadonnées
        context: {
          original_name: fileName,
          user_id: userId,
        },
        // Chiffrement
        overwrite: false,
        invalidate: true,
      },
      (error, result) => {
        if (error) {
          logger.logError(error, { 
            context: 'cloudinary_upload', 
            fileName,
            userId,
            resourceType 
          });
          reject(error);
        } else {
          logger.logInfo('File uploaded to Cloudinary', {
            fileName,
            userId,
            fileKey: result.public_id,
            size: result.bytes,
            format: result.format,
            url: result.secure_url
          });

          resolve({
            fileKey: result.public_id,
            url: result.secure_url,
            size: result.bytes,
            format: result.format,
            width: result.width,
            height: result.height,
            duration: result.duration, // Pour les vidéos
          });
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Supprimer un fichier de Cloudinary
 * @param {string} fileKey - Clé publique (public_id) du fichier
 * @returns {Promise<boolean>}
 */
async function deleteFile(fileKey) {
  if (!isConfigured) {
    throw new Error('Cloudinary not configured');
  }

  // Essayer de supprimer avec différents types de ressources
  const resourceTypes = ['raw', 'image', 'video'];
  
  for (const resourceType of resourceTypes) {
    try {
      const result = await cloudinary.uploader.destroy(fileKey, {
        invalidate: true,
        resource_type: resourceType,
      });

      if (result.result === 'ok' || result.result === 'not found') {
        logger.logInfo('File deleted from Cloudinary', { fileKey, resourceType });
        return true;
      }
    } catch (error) {
      // Si c'est une erreur de type invalide, continuer avec le type suivant
      if (error.message && error.message.includes('Invalid resource type')) {
        continue;
      }
      // Pour les autres erreurs, logger et continuer
      logger.logWarn('Error deleting file with resource type', { 
        fileKey, 
        resourceType, 
        error: error.message 
      });
    }
  }
  
  // Si aucun type n'a fonctionné, logger un avertissement mais retourner true
  // (le fichier peut ne pas exister ou avoir été supprimé)
  logger.logWarn('File deletion attempted with all resource types', { fileKey });
  return true;
}

/**
 * Générer une URL de prévisualisation optimisée
 * @param {string} fileKey - Clé publique du fichier
 * @param {Object} options - Options de transformation
 * @returns {string} URL de prévisualisation
 */
function generatePreviewUrl(fileKey, options = {}) {
  if (!isConfigured) {
    throw new Error('Cloudinary not configured');
  }

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'limit',
    mimeType, // Ajouter mimeType pour déterminer le type de ressource
  } = options;

  // Déterminer le type de ressource basé sur le mimeType
  let resourceType = 'raw'; // Par défaut pour PDFs et documents
  if (mimeType?.startsWith('image/')) {
    resourceType = 'image';
  } else if (mimeType?.startsWith('video/')) {
    resourceType = 'video';
  }

  // Pour les PDFs et documents, retourner l'URL directe sans transformation
  // Cloudinary ne peut pas transformer les PDFs
  if (resourceType === 'raw') {
    return cloudinary.url(fileKey, {
      resource_type: 'raw',
      secure: true,
    });
  }

  // Pour les images et vidéos, appliquer les transformations
  const transformations = {
    quality,
    fetch_format: format,
    secure: true,
  };

  if (width) transformations.width = width;
  if (height) transformations.height = height;
  if (crop) transformations.crop = crop;
  
  return cloudinary.url(fileKey, {
    ...transformations,
    resource_type: resourceType,
  });
}

/**
 * Générer une URL de téléchargement
 * @param {string} fileKey - Clé publique du fichier
 * @param {string} fileName - Nom du fichier pour le téléchargement
 * @returns {string} URL de téléchargement
 */
function generateDownloadUrl(fileKey, fileName) {
  if (!isConfigured) {
    throw new Error('Cloudinary not configured');
  }

  // URL avec flag de téléchargement
  return cloudinary.url(fileKey, {
    resource_type: 'auto',
    secure: true,
    flags: `attachment:${fileName}`,
  });
}

/**
 * Vérifier si un fichier existe
 * @param {string} fileKey - Clé publique du fichier
 * @returns {Promise<boolean>}
 */
async function fileExists(fileKey) {
  if (!isConfigured) {
    return false;
  }

  try {
    // Nettoyer le fileKey si nécessaire (enlever les doublons de folder)
    let cleanFileKey = fileKey;
    const duplicatePattern = /^fylora\/users\/[^/]+\/fylora\/users\/[^/]+\//;
    if (duplicatePattern.test(fileKey)) {
      cleanFileKey = fileKey.replace(/^fylora\/users\/[^/]+\//, '');
      logger.logWarn('Cleaned duplicate folder in fileKey', { original: fileKey, cleaned: cleanFileKey });
    }
    
    // Essayer avec différents types de ressources
    const resourceTypes = ['raw', 'image', 'video'];
    
    for (const resourceType of resourceTypes) {
      try {
        const result = await cloudinary.api.resource(cleanFileKey, {
          resource_type: resourceType,
        });
        if (result) {
          return true;
        }
      } catch (error) {
        // Si c'est 404, le fichier n'existe pas avec ce type, continuer
        if (error.http_code === 404) {
          continue;
        }
        // Si c'est une erreur de type invalide, continuer avec le type suivant
        if (error.message && error.message.includes('Invalid resource type')) {
          continue;
        }
        // Pour les autres erreurs, logger et continuer
        logger.logWarn('Error checking file existence', { 
          fileKey: cleanFileKey, 
          resourceType, 
          error: error.message 
        });
      }
    }
    
    // Si aucun type n'a fonctionné, considérer que le fichier n'existe pas
    return false;
  } catch (error) {
    // En cas d'erreur inconnue, considérer que le fichier existe
    // car l'upload vient de réussir, donc le fichier devrait exister
    logger.logError(error, { 
      context: 'cloudinary_file_exists', 
      fileKey,
      errorMessage: error.message,
      httpCode: error.http_code
    });
    return true;
  }
}

/**
 * Obtenir les métadonnées d'un fichier
 * @param {string} fileKey - Clé publique du fichier
 * @returns {Promise<Object>} { size, format, width, height, duration, url }
 */
async function getFileMetadata(fileKey) {
  if (!isConfigured) {
    throw new Error('Cloudinary not configured');
  }

  try {
    const result = await cloudinary.api.resource(fileKey, {
      resource_type: 'auto',
    });

    return {
      size: result.bytes,
      format: result.format,
      width: result.width,
      height: result.height,
      duration: result.duration,
      url: result.secure_url,
      createdAt: result.created_at,
    };
  } catch (error) {
    logger.logError(error, { context: 'cloudinary_get_metadata', fileKey });
    throw error;
  }
}

/**
 * Vérifier si Cloudinary est configuré
 */
function isCloudinaryConfigured() {
  return isConfigured;
}

module.exports = {
  initCloudinary,
  isCloudinaryConfigured,
  uploadFile,
  deleteFile,
  generatePreviewUrl,
  generateDownloadUrl,
  fileExists,
  getFileMetadata,
};

