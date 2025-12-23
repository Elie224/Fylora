/**
 * Contrôleur pour l'empreinte unique de fichier
 */
const fingerprintService = require('../services/fingerprintService');
const FileModel = require('../models/fileModel');
const FileFingerprint = require('../models/FileFingerprint');
const path = require('path');
const config = require('../config');

// Créer ou mettre à jour l'empreinte d'un fichier
async function createFingerprint(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const filePath = path.join(config.upload.uploadDir, file.file_path);
    const fingerprint = await fingerprintService.createFingerprint(
      id,
      userId,
      filePath,
      file.mime_type,
      file.size
    );

    res.status(200).json({
      data: fingerprint,
      message: 'Fingerprint created successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Trouver les doublons d'un fichier
async function findDuplicates(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const fingerprint = await FileFingerprint.findOne({ file_id: id });
    if (!fingerprint) {
      return res.status(404).json({
        error: { message: 'Fingerprint not found. Please create fingerprint first.' },
      });
    }

    const duplicates = await fingerprintService.findDuplicates(
      userId,
      fingerprint.content_hash
    );

    res.status(200).json({
      data: duplicates.filter(d => d.file_id._id.toString() !== id),
      count: duplicates.length - 1,
    });
  } catch (err) {
    next(err);
  }
}

// Vérifier l'intégrité d'un fichier
async function verifyIntegrity(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const filePath = path.join(config.upload.uploadDir, file.file_path);
    const result = await fingerprintService.verifyIntegrity(id, filePath);

    res.status(200).json({
      data: result,
      message: result.valid
        ? 'File integrity verified'
        : `Integrity check failed: ${result.reason}`,
    });
  } catch (err) {
    next(err);
  }
}

// Obtenir l'empreinte d'un fichier
async function getFingerprint(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const fingerprint = await FileFingerprint.findOne({ file_id: id });
    if (!fingerprint) {
      return res.status(404).json({
        error: { message: 'Fingerprint not found' },
      });
    }

    res.status(200).json({ data: fingerprint });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createFingerprint,
  findDuplicates,
  verifyIntegrity,
  getFingerprint,
};


