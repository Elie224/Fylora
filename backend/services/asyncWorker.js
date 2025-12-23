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
  const { fileId, userId, filePath, mimeType } = job.data;
  
  try {
    // Traitement en parallèle
    const [metadata, fingerprint] = await Promise.all([
      // Métadonnées intelligentes
      fileIntelligenceService.processFile(fileId, userId, filePath, mimeType),
      // Empreinte unique
      fingerprintService.createFingerprint(
        fileId,
        userId,
        filePath,
        mimeType,
        job.data.fileSize
      ),
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


