/**
 * Contrôleur pour les fonctionnalités d'intelligence des fichiers
 * OCR, résumé, mots-clés, détection de sensibilité
 */
const fileIntelligenceService = require('../services/fileIntelligenceService');
const FileMetadata = require('../models/FileMetadata');
const FileModel = require('../models/fileModel');
const path = require('path');
const config = require('../config');

// Obtenir les métadonnées intelligentes d'un fichier
async function getFileMetadata(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    let metadata = await FileMetadata.findOne({ file_id: id });
    if (!metadata) {
      // Traiter le fichier si pas encore traité
      const filePath = path.join(config.upload.uploadDir, file.file_path);
      metadata = await fileIntelligenceService.processFile(
        id,
        userId,
        filePath,
        file.mime_type
      );
    }

    res.status(200).json({ data: metadata });
  } catch (err) {
    next(err);
  }
}

// Traiter un fichier pour extraire les métadonnées
async function processFile(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const filePath = path.join(config.upload.uploadDir, file.file_path);
    const metadata = await fileIntelligenceService.processFile(
      id,
      userId,
      filePath,
      file.mime_type
    );

    res.status(200).json({
      data: metadata,
      message: 'File processed successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Obtenir les suggestions de chiffrement
async function getEncryptionSuggestions(req, res, next) {
  try {
    const userId = req.user.id;

    const metadata = await FileMetadata.find({
      user_id: userId,
      encryption_recommended: true,
    })
      .populate('file_id', 'name size mime_type')
      .sort({ sensitivity_score: -1 })
      .limit(50)
      .lean();

    res.status(200).json({
      data: metadata.map(m => ({
        file_id: m.file_id,
        encryption_reason: m.encryption_reason,
        sensitivity_score: m.sensitivity_score,
        sensitive_types: m.sensitive_types,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getFileMetadata,
  processFile,
  getEncryptionSuggestions,
};


