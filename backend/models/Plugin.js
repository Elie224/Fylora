/**
 * Modèle pour les plugins et intégrations externes
 */

const mongoose = require('mongoose');

const pluginSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  display_name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  type: {
    type: String,
    enum: ['storage', 'oauth', 'api', 'webhook'],
    required: true,
  },
  provider: {
    type: String, // 'google_drive', 'dropbox', 'onedrive', etc.
    required: true,
  },
  config: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  is_active: {
    type: Boolean,
    default: false,
  },
  is_system: {
    type: Boolean,
    default: false, // Plugins système ne peuvent pas être désactivés
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index
pluginSchema.index({ provider: 1, is_active: 1 });

const Plugin = mongoose.model('Plugin', pluginSchema);

module.exports = Plugin;


