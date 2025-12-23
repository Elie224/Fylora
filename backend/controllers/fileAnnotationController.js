/**
 * Contrôleur pour les annotations sur fichiers (PDF, images)
 */
const FileAnnotation = require('../models/FileAnnotation');
const FileModel = require('../models/fileModel');

// Créer une annotation
async function createAnnotation(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { annotation_type, position, content, style, raw_data, is_public } = req.body;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const annotation = new FileAnnotation({
      file_id: id,
      user_id: userId,
      annotation_type: annotation_type || 'note',
      position: position || {},
      content,
      style: style || {},
      raw_data: raw_data || {},
      is_public: is_public || false,
    });

    await annotation.save();
    await annotation.populate('user_id', 'display_name email');

    res.status(201).json({
      data: annotation,
      message: 'Annotation created successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Obtenir les annotations d'un fichier
async function getAnnotations(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const file = await FileModel.findById(id);
    if (!file || file.owner_id !== userId) {
      return res.status(404).json({ error: { message: 'File not found' } });
    }

    const annotations = await FileAnnotation.find({
      file_id: id,
      $or: [
        { user_id: userId },
        { is_public: true },
      ],
    })
      .populate('user_id', 'display_name email')
      .sort({ created_at: 1 })
      .lean();

    res.status(200).json({ data: annotations });
  } catch (err) {
    next(err);
  }
}

// Mettre à jour une annotation
async function updateAnnotation(req, res, next) {
  try {
    const { annotationId } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const annotation = await FileAnnotation.findOne({
      _id: annotationId,
      user_id: userId,
    });

    if (!annotation) {
      return res.status(404).json({ error: { message: 'Annotation not found' } });
    }

    Object.assign(annotation, updates);
    annotation.updated_at = new Date();
    await annotation.save();

    res.status(200).json({
      data: annotation,
      message: 'Annotation updated successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Supprimer une annotation
async function deleteAnnotation(req, res, next) {
  try {
    const { annotationId } = req.params;
    const userId = req.user.id;

    const annotation = await FileAnnotation.findOne({
      _id: annotationId,
      user_id: userId,
    });

    if (!annotation) {
      return res.status(404).json({ error: { message: 'Annotation not found' } });
    }

    await FileAnnotation.findByIdAndDelete(annotationId);

    res.status(200).json({
      message: 'Annotation deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createAnnotation,
  getAnnotations,
  updateAnnotation,
  deleteAnnotation,
};


