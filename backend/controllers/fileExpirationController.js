/**
 * Contrôleur pour l'expiration automatique des fichiers
 */
const FileExpiration = require('../models/FileExpiration');
const FileModel = require('../models/fileModel');
const FileUsage = require('../models/FileUsage');

// Créer ou mettre à jour une expiration
async function createExpiration(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { expires_at, expiration_action, archive_folder_id } = req.body;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    if (!expires_at) {
      return res.status(400).json({
        error: { message: 'expires_at is required' },
      });
    }

    const expirationDate = new Date(expires_at);
    if (expirationDate <= new Date()) {
      return res.status(400).json({
        error: { message: 'expires_at must be in the future' },
      });
    }

    let expiration = await FileExpiration.findOne({ file_id: id });
    
    if (expiration) {
      expiration.expires_at = expirationDate;
      expiration.expiration_action = expiration_action || expiration.expiration_action;
      expiration.archive_folder_id = archive_folder_id || expiration.archive_folder_id;
    } else {
      expiration = new FileExpiration({
        file_id: id,
        user_id: userId,
        expires_at: expirationDate,
        expiration_action: expiration_action || 'move_to_trash',
        archive_folder_id: archive_folder_id || null,
      });
    }

    await expiration.save();

    res.status(200).json({
      data: expiration,
      message: 'Expiration set successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Obtenir l'expiration d'un fichier
async function getExpiration(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const expiration = await FileExpiration.findOne({ file_id: id }).lean();

    res.status(200).json({
      data: expiration || null,
    });
  } catch (err) {
    next(err);
  }
}

// Supprimer une expiration
async function deleteExpiration(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    await FileExpiration.deleteOne({ file_id: id });

    res.status(200).json({
      message: 'Expiration removed successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Obtenir les fichiers expirés
async function getExpiredFiles(req, res, next) {
  try {
    const userId = req.user.id;

    const expired = await FileExpiration.find({
      user_id: userId,
      expires_at: { $lte: new Date() },
      is_expired: false,
    })
      .populate('file_id', 'name size mime_type')
      .sort({ expires_at: 1 })
      .limit(100)
      .lean();

    res.status(200).json({ data: expired });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createExpiration,
  getExpiration,
  deleteExpiration,
  getExpiredFiles,
};


