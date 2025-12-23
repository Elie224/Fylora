/**
 * Modèle pour les annotations sur fichiers (PDF, images)
 */
const mongoose = require('mongoose');

const fileAnnotationSchema = new mongoose.Schema({
  file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  annotation_type: {
    type: String,
    required: true,
    enum: ['highlight', 'note', 'drawing', 'stamp', 'text', 'arrow', 'rectangle', 'circle'],
    default: 'note',
  },
  // Position dans le document (pour PDF: page, x, y)
  position: {
    page: Number,
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    coordinates: [{
      x: Number,
      y: Number,
    }],
  },
  // Contenu de l'annotation
  content: {
    type: String,
    maxlength: 5000,
  },
  // Style de l'annotation
  style: {
    color: { type: String, default: '#FFEB3B' },
    opacity: { type: Number, default: 0.5, min: 0, max: 1 },
    strokeWidth: { type: Number, default: 2 },
    fontSize: { type: Number, default: 12 },
  },
  // Données brutes (pour dessins, formes complexes)
  raw_data: {
    type: mongoose.Schema.Types.Mixed,
  },
  // Visibilité
  is_public: {
    type: Boolean,
    default: false,
  },
  // Résolu/archivé
  resolved: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index pour requêtes fréquentes
fileAnnotationSchema.index({ file_id: 1, user_id: 1, created_at: -1 });
fileAnnotationSchema.index({ file_id: 1, annotation_type: 1 });

const FileAnnotation = mongoose.model('FileAnnotation', fileAnnotationSchema);

module.exports = FileAnnotation;


