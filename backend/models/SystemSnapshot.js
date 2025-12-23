/**
 * Modèle pour les snapshots système (retour dans le temps)
 */
const mongoose = require('mongoose');

const systemSnapshotSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  snapshot_type: {
    type: String,
    enum: ['full', 'incremental', 'manual'],
    default: 'incremental',
    index: true,
  },
  // Description du snapshot
  description: {
    type: String,
    maxlength: 500,
  },
  // État des fichiers au moment du snapshot
  files_state: [{
    file_id: mongoose.Schema.Types.ObjectId,
    name: String,
    path: String,
    size: Number,
    mime_type: String,
    folder_id: mongoose.Schema.Types.ObjectId,
    version: Number,
  }],
  // État des dossiers
  folders_state: [{
    folder_id: mongoose.Schema.Types.ObjectId,
    name: String,
    path: String,
    parent_id: mongoose.Schema.Types.ObjectId,
  }],
  // Métadonnées du snapshot
  metadata: {
    total_files: Number,
    total_folders: Number,
    total_size: Number,
    file_count_by_type: Map,
  },
  // Snapshot parent (pour snapshots incrémentaux)
  parent_snapshot_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SystemSnapshot',
    default: null,
  },
  // Date du snapshot
  snapshot_date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  // Expiration automatique
  expires_at: {
    type: Date,
    default: null,
    index: true,
  },
  // Taille du snapshot (pour gestion de stockage)
  snapshot_size: {
    type: Number,
    default: 0,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index pour requêtes fréquentes
systemSnapshotSchema.index({ user_id: 1, snapshot_date: -1 });
systemSnapshotSchema.index({ snapshot_type: 1, snapshot_date: -1 });

// TTL index pour nettoyage automatique
systemSnapshotSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const SystemSnapshot = mongoose.model('SystemSnapshot', systemSnapshotSchema);

module.exports = SystemSnapshot;


