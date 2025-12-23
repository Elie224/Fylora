/**
 * Contrôleur pour la validation de fichiers
 */
const FileValidation = require('../models/FileValidation');
const FileModel = require('../models/fileModel');

// Créer ou mettre à jour une validation
async function createValidation(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status, validation_comment, validation_tags } = req.body;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    let validation = await FileValidation.findOne({ file_id: id });
    
    if (validation) {
      validation.status = status || validation.status;
      validation.validation_comment = validation_comment || validation.validation_comment;
      validation.validation_tags = validation_tags || validation.validation_tags;
      if (status === 'approved' || status === 'rejected') {
        validation.validated_by = userId;
        validation.validated_at = new Date();
      }
    } else {
      validation = new FileValidation({
        file_id: id,
        user_id: userId,
        status: status || 'pending',
        validation_comment,
        validation_tags: validation_tags || [],
      });
    }

    await validation.save();
    await validation.populate('validated_by', 'display_name email');

    res.status(200).json({
      data: validation,
      message: 'Validation updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Obtenir la validation d'un fichier
async function getValidation(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const validation = await FileValidation.findOne({ file_id: id })
      .populate('validated_by', 'display_name email')
      .lean();

    if (!validation) {
      return res.status(200).json({
        data: {
          file_id: id,
          status: 'pending',
        },
      });
    }

    res.status(200).json({ data: validation });
  } catch (err) {
    next(err);
  }
}

// Lister les validations par statut
async function getValidationsByStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const query = { user_id: userId };
    if (status) {
      query.status = status;
    }

    const validations = await FileValidation.find(query)
      .populate('file_id', 'name size mime_type')
      .populate('validated_by', 'display_name email')
      .sort({ created_at: -1 })
      .limit(100)
      .lean();

    res.status(200).json({ data: validations });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createValidation,
  getValidation,
  getValidationsByStatus,
};


