/**
 * Modèle pour les notifications
 * Stocke les notifications pour les utilisateurs
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'file_shared',
      'file_uploaded',
      'quota_warning',
      'quota_exceeded',
      'share_expired',
      'collaboration_invite',
      'comment_added',
      'version_created',
      'system_announcement',
    ],
    index: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  resource_type: {
    type: String,
    enum: ['file', 'folder', 'share', 'user', 'system'],
    default: null,
  },
  resource_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  is_read: {
    type: Boolean,
    default: false,
    index: true,
  },
  read_at: {
    type: Date,
    default: null,
  },
  action_url: {
    type: String,
    default: null,
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false,
});

// Index composé pour les requêtes fréquentes
notificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });
notificationSchema.index({ user_id: 1, type: 1 });

// TTL index pour supprimer automatiquement les notifications lues de plus de 30 jours
notificationSchema.index(
  { read_at: 1 },
  { expireAfterSeconds: 2592000, partialFilterExpression: { is_read: true } }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;





