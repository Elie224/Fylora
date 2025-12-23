/**
 * Modèle pour la synchronisation hors ligne
 * Gère la file d'attente des actions hors ligne
 */

const mongoose = require('mongoose');

const offlineSyncSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action_type: {
    type: String,
    enum: ['upload', 'delete', 'rename', 'move', 'create_folder', 'update_note'],
    required: true,
  },
  resource_type: {
    type: String,
    enum: ['file', 'folder', 'note'],
    required: true,
  },
  resource_id: {
    type: mongoose.Schema.Types.ObjectId,
  },
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  file_data: {
    type: Buffer, // Pour les uploads hors ligne
  },
  status: {
    type: String,
    enum: ['pending', 'syncing', 'completed', 'failed'],
    default: 'pending',
  },
  error_message: String,
  retry_count: {
    type: Number,
    default: 0,
  },
  max_retries: {
    type: Number,
    default: 3,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  synced_at: Date,
}, {
  timestamps: true,
});

// Index pour les requêtes de synchronisation
offlineSyncSchema.index({ user_id: 1, status: 1, created_at: 1 });
offlineSyncSchema.index({ status: 1, created_at: 1 }); // Pour le traitement par batch

const OfflineSync = mongoose.model('OfflineSync', offlineSyncSchema);

module.exports = OfflineSync;


