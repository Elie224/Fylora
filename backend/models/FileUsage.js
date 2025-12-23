/**
 * Modèle pour le tracking d'utilisation des fichiers
 * Mémoire d'usage - Tracking intelligent
 */
const mongoose = require('mongoose');

const fileUsageSchema = new mongoose.Schema({
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
  action_type: {
    type: String,
    required: true,
    enum: ['open', 'download', 'preview', 'edit', 'share', 'delete', 'restore'],
    index: true,
  },
  duration_ms: {
    type: Number,
    default: 0, // Durée d'ouverture/utilisation en millisecondes
  },
  access_count: {
    type: Number,
    default: 1,
  },
  last_accessed_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  first_accessed_at: {
    type: Date,
    default: Date.now,
  },
  ip_address: String,
  user_agent: String,
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Index composés pour les requêtes fréquentes
fileUsageSchema.index({ file_id: 1, user_id: 1, last_accessed_at: -1 });
fileUsageSchema.index({ user_id: 1, last_accessed_at: -1 });
fileUsageSchema.index({ file_id: 1, action_type: 1 });

// Index pour statistiques
fileUsageSchema.index({ user_id: 1, action_type: 1, last_accessed_at: -1 });

const FileUsage = mongoose.model('FileUsage', fileUsageSchema);

module.exports = FileUsage;


