/**
 * Service de Stockage Supabase
 * Alternative simple et gratuite à AWS S3
 * 
 * Avantages:
 * - Gratuit jusqu'à 1 Go
 * - Configuration très simple (juste une URL et une clé)
 * - Persistant et fiable
 * - Pas besoin de créer un compte AWS complexe
 */

const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

let supabaseClient = null;
let isConfigured = false;

/**
 * Initialiser le client Supabase
 */
function initSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  // Essayer service_role (legacy) ou secret key (nouvelle), mais PAS anon
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                      process.env.SUPABASE_SECRET_KEY || 
                      process.env.SUPABASE_KEY;
  const bucketName = process.env.SUPABASE_BUCKET || 'fylora-files';

  if (!supabaseUrl || !supabaseKey) {
    logger.logWarn('Supabase not configured, using local storage');
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    isConfigured = true;
    
    logger.logInfo('Supabase storage service initialized', {
      url: supabaseUrl,
      bucket: bucketName
    });

    return { supabaseClient, bucketName };
  } catch (err) {
    logger.logError(err, { context: 'supabase_init' });
    return null;
  }
}

const { supabaseClient: initializedClient, bucketName } = initSupabase() || {};
if (initializedClient) {
  supabaseClient = initializedClient;
}

/**
 * Vérifier si Supabase est configuré
 */
function isSupabaseConfigured() {
  return isConfigured && supabaseClient !== null;
}

/**
 * Uploader un fichier vers Supabase
 * @param {Buffer} fileBuffer - Contenu du fichier
 * @param {string} userId - ID utilisateur
 * @param {string} fileName - Nom du fichier
 * @param {string} mimeType - Type MIME
 * @returns {Promise<Object>} { fileKey, url }
 */
async function uploadFile(fileBuffer, userId, fileName, mimeType) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const fileExtension = fileName.split('.').pop() || '';
  const fileKey = `users/${userId}/${uuidv4()}.${fileExtension}`;
  const bucket = process.env.SUPABASE_BUCKET || 'fylora-files';

  try {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(fileKey, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(fileKey);

    logger.logInfo('File uploaded to Supabase', {
      fileKey,
      fileName,
      userId,
      size: fileBuffer.length
    });

    return {
      fileKey: data.path,
      url: urlData.publicUrl,
      size: fileBuffer.length
    };
  } catch (error) {
    logger.logError(error, {
      context: 'supabase_upload',
      fileName,
      userId
    });
    throw new Error('Failed to upload file to Supabase');
  }
}

/**
 * Générer une URL signée pour téléchargement
 * @param {string} fileKey - Clé du fichier
 * @param {number} expiresIn - Durée de validité en secondes (défaut: 3600)
 * @returns {Promise<string>} URL signée
 */
async function generateDownloadUrl(fileKey, expiresIn = 3600) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const bucket = process.env.SUPABASE_BUCKET || 'fylora-files';

  try {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .createSignedUrl(fileKey, expiresIn);

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    logger.logError(error, {
      context: 'supabase_download_url',
      fileKey
    });
    throw new Error('Failed to generate download URL');
  }
}

/**
 * Générer une URL publique pour prévisualisation
 * @param {string} fileKey - Clé du fichier
 * @returns {string} URL publique
 */
function generatePreviewUrl(fileKey) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const bucket = process.env.SUPABASE_BUCKET || 'fylora-files';

  try {
    const { data } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(fileKey);

    return data.publicUrl;
  } catch (error) {
    logger.logError(error, {
      context: 'supabase_preview_url',
      fileKey
    });
    throw new Error('Failed to generate preview URL');
  }
}

/**
 * Vérifier si un fichier existe
 * @param {string} fileKey - Clé du fichier
 * @returns {Promise<boolean>}
 */
async function fileExists(fileKey) {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const bucket = process.env.SUPABASE_BUCKET || 'fylora-files';

  try {
    // Utiliser list pour vérifier l'existence
    const pathParts = fileKey.split('/');
    const folderPath = pathParts.slice(0, -1).join('/');
    const fileName = pathParts[pathParts.length - 1];
    
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .list(folderPath || '', {
        limit: 1000,
        search: fileName
      });

    if (error) {
      return false;
    }

    return data && data.some(file => file.name === fileName);
  } catch (error) {
    logger.logError(error, {
      context: 'supabase_file_exists',
      fileKey
    });
    return false;
  }
}

/**
 * Supprimer un fichier
 * @param {string} fileKey - Clé du fichier
 * @returns {Promise<boolean>}
 */
async function deleteFile(fileKey) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const bucket = process.env.SUPABASE_BUCKET || 'fylora-files';

  try {
    const { error } = await supabaseClient.storage
      .from(bucket)
      .remove([fileKey]);

    if (error) {
      throw error;
    }

    logger.logInfo('File deleted from Supabase', { fileKey });
    return true;
  } catch (error) {
    logger.logError(error, {
      context: 'supabase_delete',
      fileKey
    });
    throw new Error('Failed to delete file from Supabase');
  }
}

/**
 * Obtenir les métadonnées d'un fichier
 * @param {string} fileKey - Clé du fichier
 * @returns {Promise<Object>} { size, contentType, lastModified }
 */
async function getFileMetadata(fileKey) {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  const bucket = process.env.SUPABASE_BUCKET || 'fylora-files';

  try {
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .list(fileKey.split('/').slice(0, -1).join('/'));

    if (error) {
      throw error;
    }

    const fileName = fileKey.split('/').pop();
    const file = data.find(f => f.name === fileName);

    if (!file) {
      throw new Error('File not found');
    }

    return {
      size: file.metadata?.size || 0,
      contentType: file.metadata?.mimetype || 'application/octet-stream',
      lastModified: file.updated_at || file.created_at,
    };
  } catch (error) {
    logger.logError(error, {
      context: 'supabase_metadata',
      fileKey
    });
    throw new Error('Failed to get file metadata');
  }
}

module.exports = {
  isSupabaseConfigured,
  uploadFile,
  generateDownloadUrl,
  generatePreviewUrl,
  fileExists,
  deleteFile,
  getFileMetadata,
  bucketName: bucketName || 'fylora-files',
};

