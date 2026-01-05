/**
 * Service de Stockage Frontend
 * Upload/Download direct vers/depuis S3 avec URLs signées
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/**
 * Obtenir une URL signée pour upload
 * @param {Object} fileData - { fileName, fileSize, mimeType, folderId? }
 * @returns {Promise<Object>} { uploadUrl, fields, fileKey, expiresAt }
 */
export async function getUploadUrl(fileData) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_URL}/api/storage/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(fileData)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Upload URL generation failed' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Uploader un fichier directement vers S3
 * @param {File} file - Fichier à uploader
 * @param {Object} uploadData - { uploadUrl, fields, fileKey }
 * @param {Function} onProgress - Callback de progression (bytesUploaded, totalBytes)
 * @returns {Promise<Object>} { etag, fileKey }
 */
export async function uploadToS3(file, uploadData, onProgress) {
  const { uploadUrl, fields } = uploadData;

  // Créer FormData avec les champs requis par S3
  const formData = new FormData();
  
  // Ajouter tous les champs de S3
  Object.keys(fields).forEach(key => {
    formData.append(key, fields[key]);
  });
  
  // Ajouter le fichier en dernier (S3 requirement)
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Suivre la progression
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded, e.total);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 204 || xhr.status === 200) {
        // Extraire l'ETag de la réponse
        const etag = xhr.getResponseHeader('ETag')?.replace(/"/g, '');
        resolve({
          etag,
          fileKey: uploadData.fileKey
        });
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('POST', uploadUrl);
    xhr.send(formData);
  });
}

/**
 * Finaliser l'upload après upload S3 réussi
 * @param {string} fileKey - Clé S3 du fichier
 * @param {string} etag - ETag retourné par S3
 * @returns {Promise<Object>} Fichier créé
 */
export async function finalizeUpload(fileKey, etag) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_URL}/api/files/v2/finalize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ fileKey, etag })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Finalization failed' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Obtenir une URL signée pour download
 * @param {string} fileId - ID du fichier
 * @returns {Promise<string>} URL de téléchargement
 */
export async function getDownloadUrl(fileId) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_URL}/api/files/v2/${fileId}/download-url`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Download URL generation failed' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data.downloadUrl;
}

/**
 * Obtenir une URL signée pour prévisualisation
 * @param {string} fileId - ID du fichier
 * @returns {Promise<string>} URL de prévisualisation
 */
export async function getPreviewUrl(fileId) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_URL}/api/files/v2/${fileId}/preview-url`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Preview URL generation failed' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data.previewUrl;
}

/**
 * Upload complet avec gestion automatique
 * @param {File} file - Fichier à uploader
 * @param {Object} options - { folderId?, onProgress? }
 * @returns {Promise<Object>} Fichier créé
 */
export async function uploadFile(file, options = {}) {
  const { folderId, onProgress } = options;

  // 1. Obtenir l'URL d'upload
  const uploadData = await getUploadUrl({
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    folderId
  });

  // 2. Uploader directement vers S3
  const { etag } = await uploadToS3(file, uploadData, onProgress);

  // 3. Finaliser l'upload
  const fileRecord = await finalizeUpload(uploadData.fileKey, etag);

  return fileRecord;
}

/**
 * Télécharger un fichier directement depuis S3
 * @param {string} fileId - ID du fichier
 * @param {string} fileName - Nom du fichier pour le téléchargement
 * @returns {Promise<void>}
 */
export async function downloadFile(fileId, fileName) {
  // Obtenir l'URL signée
  const downloadUrl = await getDownloadUrl(fileId);

  // Créer un lien temporaire et déclencher le téléchargement
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Initier un upload multipart (pour fichiers volumineux)
 * @param {Object} fileData - { fileName, fileSize, mimeType, folderId? }
 * @returns {Promise<Object>} { uploadId, fileKey }
 */
export async function initiateMultipartUpload(fileData) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_URL}/api/files/v2/multipart/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(fileData)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Multipart initiation failed' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Obtenir une URL pour upload d'un chunk
 * @param {string} uploadId - ID de l'upload multipart
 * @param {number} partNumber - Numéro du chunk
 * @param {number} chunkSize - Taille du chunk
 * @returns {Promise<string>} URL d'upload du chunk
 */
export async function getChunkUploadUrl(uploadId, partNumber, chunkSize) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_URL}/api/files/v2/multipart/chunk-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ uploadId, partNumber, chunkSize })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Chunk URL generation failed' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data.uploadUrl;
}

/**
 * Uploader un chunk vers S3
 * @param {Blob} chunk - Chunk à uploader
 * @param {string} uploadUrl - URL signée
 * @returns {Promise<string>} ETag du chunk
 */
export async function uploadChunk(chunk, uploadUrl) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: chunk,
    headers: {
      'Content-Length': chunk.size.toString()
    }
  });

  if (!response.ok) {
    throw new Error(`Chunk upload failed: ${response.status} ${response.statusText}`);
  }

  const etag = response.headers.get('ETag')?.replace(/"/g, '');
  if (!etag) {
    throw new Error('ETag not found in response');
  }

  return etag;
}

/**
 * Finaliser un upload multipart
 * @param {string} uploadId - ID de l'upload multipart
 * @param {Array} parts - Array de { etag, partNumber }
 * @returns {Promise<Object>} Fichier créé
 */
export async function completeMultipartUpload(uploadId, parts) {
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${API_URL}/api/files/v2/multipart/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ uploadId, parts })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Multipart completion failed' } }));
    throw new Error(error.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Upload multipart complet avec gestion automatique
 * @param {File} file - Fichier à uploader
 * @param {Object} options - { folderId?, chunkSize?, onProgress? }
 * @returns {Promise<Object>} Fichier créé
 */
export async function uploadFileMultipart(file, options = {}) {
  const { folderId, chunkSize = 5 * 1024 * 1024, onProgress } = options; // 5 MB par défaut

  // 1. Initier l'upload multipart
  const { uploadId, fileKey } = await initiateMultipartUpload({
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    folderId
  });

  // 2. Diviser le fichier en chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  const parts = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    const partNumber = i + 1;

    // Obtenir l'URL pour ce chunk
    const chunkUrl = await getChunkUploadUrl(uploadId, partNumber, chunk.size);

    // Uploader le chunk
    const etag = await uploadChunk(chunk, chunkUrl);
    parts.push({ etag, partNumber });

    // Progression
    if (onProgress) {
      onProgress(end, file.size);
    }
  }

  // 3. Finaliser l'upload
  const fileRecord = await completeMultipartUpload(uploadId, parts);

  return fileRecord;
}

export default {
  getUploadUrl,
  uploadToS3,
  finalizeUpload,
  getDownloadUrl,
  getPreviewUrl,
  uploadFile,
  downloadFile,
  initiateMultipartUpload,
  getChunkUploadUrl,
  uploadChunk,
  completeMultipartUpload,
  uploadFileMultipart,
};

