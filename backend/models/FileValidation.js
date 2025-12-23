/**
 * Modèle pour la validation de fichiers (approuvé/rejeté/en attente)
 */
const mongoose = require('mongoose');

const fileValidationSchema = new mongoose.Schema({
  file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
    unique: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'needs_review'],
    default: 'pending',
    index: true,
  },
  // Validateur (peut être différent du propriétaire)
  validated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  validated_at: {
    type: Date,
    default: null,
  },
  // Commentaire de validation
  validation_comment: {
    type: String,
    maxlength: 1000,
  },
  // Raison du rejet
  rejection_reason: {
    type: String,
    maxlength: 500,
  },
  // Tags de validation
  validation_tags: [{
    type: String,
  }],
  // Métadonnées supplémentaires
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index pour requêtes fréquentes
fileValidationSchema.index({ user_id: 1, status: 1, created_at: -1 });
fileValidationSchema.index({ status: 1, validated_at: -1 });

const FileValidation = mongoose.model('FileValidation', fileValidationSchema);

module.exports = FileValidation;


