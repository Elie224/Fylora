/**
 * Modèle pour les versions de fichiers
 * Permet de garder un historique des versions d'un fichier
 */

const mongoose = require('mongoose');

const fileVersionSchema = new mongoose.Schema({
  file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
    index: true,
  },
  version_number: {
    type: Number,
    required: true,
  },
  file_path: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  mime_type: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  is_current: {
    type: Boolean,
    default: false,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Index composé pour les requêtes fréquentes
fileVersionSchema.index({ file_id: 1, version_number: -1 });
fileVersionSchema.index({ file_id: 1, is_current: 1 });

const FileVersion = mongoose.model('FileVersion', fileVersionSchema);

module.exports = FileVersion;





