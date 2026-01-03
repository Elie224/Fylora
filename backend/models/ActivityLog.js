/**
 * Modèle pour l'historique des activités
 * Enregistre toutes les actions importantes des utilisateurs
 */

const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action_type: {
    type: String,
    required: true,
    enum: [
      'file_upload',
      'file_download',
      'file_delete',
      'file_rename',
      'file_move',
      'file_share',
      'file_restore',
      'folder_create',
      'folder_delete',
      'folder_rename',
      'folder_move',
      'folder_restore',
      'share_create',
      'share_delete',
      'login',
      'logout',
      'password_change',
      'profile_update',
      'note_create',
      'note_create_from_template',
      'note_update',
      'note_delete',
      'note_permanent_delete',
      'note_restore',
      'note_share',
      'note_comment',
      'template_create',
      'template_update',
      'template_delete',
    ],
    index: true,
  },
  resource_type: {
    type: String,
    enum: ['file', 'folder', 'user', 'share', 'system', 'note'],
    required: true,
  },
  resource_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ip_address: {
    type: String,
    index: true,
  },
  user_agent: {
    type: String,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false, // On utilise created_at manuellement
});

// Index composé pour les requêtes fréquentes
activityLogSchema.index({ user_id: 1, created_at: -1 });
activityLogSchema.index({ resource_type: 1, resource_id: 1 });
activityLogSchema.index({ action_type: 1, created_at: -1 });

// TTL index pour supprimer automatiquement les logs de plus de 1 an
activityLogSchema.index({ created_at: 1 }, { expireAfterSeconds: 31536000 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;


