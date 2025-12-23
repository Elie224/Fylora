/**
 * Modèle pour les suggestions de rangement intelligentes
 */
const mongoose = require('mongoose');

const fileRecommendationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  recommendation_type: {
    type: String,
    enum: [
      'organize_by_type',
      'organize_by_date',
      'organize_by_project',
      'cleanup_duplicates',
      'cleanup_old_files',
      'cleanup_large_files',
      'create_folder_structure',
      'move_to_archive',
    ],
    required: true,
    index: true,
  },
  // Fichiers concernés
  file_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
  }],
  // Dossiers concernés
  folder_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
  }],
  // Action suggérée
  suggested_action: {
    type: String,
    required: true,
  },
  // Détails de la suggestion
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Score de confiance (0-1)
  confidence_score: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  // Espace libéré estimé (en bytes)
  estimated_space_freed: {
    type: Number,
    default: 0,
  },
  // Appliqué
  applied: {
    type: Boolean,
    default: false,
    index: true,
  },
  applied_at: {
    type: Date,
    default: null,
  },
  // Ignoré
  ignored: {
    type: Boolean,
    default: false,
  },
  ignored_at: {
    type: Date,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Index pour requêtes fréquentes
fileRecommendationSchema.index({ user_id: 1, applied: 1, ignored: 1, created_at: -1 });
fileRecommendationSchema.index({ recommendation_type: 1, confidence_score: -1 });

const FileRecommendation = mongoose.model('FileRecommendation', fileRecommendationSchema);

module.exports = FileRecommendation;


