/**
 * Workers asynchrones pour traitements lourds
 * Upload analysis, previews, IA, etc.
 */
const { queues } = require('../utils/queue');
const fileIntelligenceService = require('./fileIntelligenceService');
const fingerprintService = require('./fingerprintService');
const path = require('path');
const config = require('../config');
const FileModel = require('../models/fileModel');

/**
 * Worker pour traitement de fichiers (OCR, métadonnées, empreinte)
 */
async function processFileWorker(job) {
  const { fileId, userId, filePath, mimeType, storageType, storagePath } = job.data;
  
  try {
    // Traitement en parallèle
    const [metadata, fingerprint] = await Promise.all([
      // Métadonnées intelligentes
      fileIntelligenceService.processFile(fileId, userId, filePath, mimeType, storageType, storagePath),
      // Empreinte unique (nécessite le fichier local, donc télécharger depuis Cloudinary si nécessaire)
      (async () => {
        try {
          let localFilePath = filePath;
          
          // Si le fichier est sur Cloudinary, le télécharger temporairement
          if (storageType === 'cloudinary' && storagePath) {
            const cloudinaryService = require('./cloudinaryService');
            const axios = require('axios');
            const fs = require('fs').promises;
            const path = require('path');
            const { v4: uuidv4 } = require('uuid');
            const config = require('../config');
            
            const downloadUrl = cloudinaryService.generateDownloadUrl(storagePath, 'file');
            const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
            const tempPath = path.join(config.upload.uploadDir, `temp_${uuidv4()}`);
            await fs.writeFile(tempPath, Buffer.from(response.data));
            localFilePath = tempPath;
            
            try {
              const fingerprint = await fingerprintService.createFingerprint(
                fileId,
                userId,
                localFilePath,
                mimeType,
                job.data.fileSize
              );
              // Nettoyer le fichier temporaire
              await fs.unlink(tempPath).catch(() => {});
              return fingerprint;
            } catch (err) {
              // Nettoyer le fichier temporaire même en cas d'erreur
              await fs.unlink(tempPath).catch(() => {});
              throw err;
            }
          } else {
            return await fingerprintService.createFingerprint(
              fileId,
              userId,
              localFilePath,
              mimeType,
              job.data.fileSize
            );
          }
        } catch (err) {
          console.error('Fingerprint creation failed:', err);
          return null;
        }
      })(),
    ]);

    return { metadata, fingerprint };
  } catch (error) {
    console.error('File processing worker error:', error);
    throw error;
  }
}

/**
 * Worker pour génération de previews
 */
async function generatePreviewWorker(job) {
  const { fileId, filePath, mimeType } = job.data;
  
  try {
    // Générer preview selon le type
    if (mimeType.startsWith('image/')) {
      // Utiliser Sharp pour optimiser l'image
      const sharp = require('sharp');
      const previewPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '_preview.jpg');
      
      await sharp(filePath)
        .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(previewPath);
      
      return { previewPath };
    }
    
    // Pour PDF, générer première page en image
    if (mimeType === 'application/pdf') {
      // Utiliser pdf-parse + sharp pour générer preview
      // Implémentation simplifiée
      return { previewPath: null };
    }
    
    return { previewPath: null };
  } catch (error) {
    console.error('Preview generation worker error:', error);
    throw error;
  }
}

/**
 * Worker pour notifications
 */
async function sendNotificationWorker(job) {
  const { userId, type, data } = job.data;
  
  try {
    const Notification = require('../models/Notification');
    const notification = new Notification({
      user_id: userId,
      type,
      data,
      is_read: false,
    });
    
    await notification.save();
    
    // Envoyer via WebSocket si disponible
    const { io } = require('../services/websocketService');
    if (io) {
      io.to(`user:${userId}`).emit('notification', notification);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Notification worker error:', error);
    throw error;
  }
}

/**
 * Initialiser les workers
 */
function initializeWorkers() {
  // Worker traitement de fichiers
  queues.fileProcessing.onJob(processFileWorker);
  
  // Worker previews
  queues.fileProcessing.onJob(generatePreviewWorker);
  
  // Worker notifications
  queues.emails.onJob(sendNotificationWorker);
  
  console.log('✅ Async workers initialized');
}

module.exports = {
  initializeWorkers,
  processFileWorker,
  generatePreviewWorker,
  sendNotificationWorker,
};


