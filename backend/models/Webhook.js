/**
 * Modèle pour les webhooks
 */
const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // URL du webhook
  url: {
    type: String,
    required: true,
    maxlength: 500,
  },
  // Événements à écouter
  events: [{
    type: String,
    enum: [
      'file.uploaded',
      'file.deleted',
      'file.downloaded',
      'file.shared',
      'file.updated',
      'folder.created',
      'folder.deleted',
      'user.login',
      'user.logout',
      'share.created',
      'share.deleted',
    ],
  }],
  // Secret pour signer les requêtes
  secret: {
    type: String,
    required: true,
  },
  // Actif
  is_active: {
    type: Boolean,
    default: true,
    index: true,
  },
  // Nombre de tentatives en cas d'échec
  retry_count: {
    type: Number,
    default: 0,
  },
  // Dernière tentative
  last_attempt_at: {
    type: Date,
    default: null,
  },
  // Dernier succès
  last_success_at: {
    type: Date,
    default: null,
  },
  // Dernière erreur
  last_error: {
    message: String,
    code: String,
    timestamp: Date,
  },
  // Headers personnalisés
  headers: {
    type: Map,
    of: String,
    default: {},
  },
  // Timeout en ms
  timeout_ms: {
    type: Number,
    default: 5000,
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
webhookSchema.index({ user_id: 1, is_active: 1 });
webhookSchema.index({ events: 1 });

const Webhook = mongoose.model('Webhook', webhookSchema);

module.exports = Webhook;


