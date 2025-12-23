/**
 * Modèle pour l'archivage intelligent
 */
const mongoose = require('mongoose');

const fileArchiveSchema = new mongoose.Schema({
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
  // Raison de l'archivage
  archive_reason: {
    type: String,
    enum: ['manual', 'inactive', 'old', 'low_access', 'size_optimization', 'compliance'],
    required: true,
  },
  // Date d'archivage
  archived_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  // Date de dernière utilisation avant archivage
  last_accessed_before_archive: {
    type: Date,
    default: null,
  },
  // Emplacement de l'archive (peut être différent du stockage principal)
  archive_location: {
    type: String,
    default: null,
  },
  // Compression appliquée
  compressed: {
    type: Boolean,
    default: false,
  },
  // Taille originale
  original_size: {
    type: Number,
    required: true,
  },
  // Taille archivée
  archived_size: {
    type: Number,
    required: true,
  },
  // Restauré
  restored: {
    type: Boolean,
    default: false,
  },
  restored_at: {
    type: Date,
    default: null,
  },
  // Métadonnées d'archivage
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index pour requêtes fréquentes
fileArchiveSchema.index({ user_id: 1, archived_at: -1 });
fileArchiveSchema.index({ archive_reason: 1, archived_at: -1 });
fileArchiveSchema.index({ restored: 1, archived_at: -1 });

const FileArchive = mongoose.model('FileArchive', fileArchiveSchema);

module.exports = FileArchive;


