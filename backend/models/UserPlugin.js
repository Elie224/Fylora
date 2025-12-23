/**
 * Modèle pour les plugins activés par utilisateur
 */

const mongoose = require('mongoose');

const userPluginSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  plugin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plugin',
    required: true,
  },
  credentials: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  settings: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  last_sync_at: Date,
  is_active: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index unique pour éviter les doublons
userPluginSchema.index({ user_id: 1, plugin_id: 1 }, { unique: true });

const UserPlugin = mongoose.model('UserPlugin', userPluginSchema);

module.exports = UserPlugin;


