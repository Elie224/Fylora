/**
 * Modèle pour l'expiration automatique des fichiers
 */
const mongoose = require('mongoose');

const fileExpirationSchema = new mongoose.Schema({
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
  // Date d'expiration
  expires_at: {
    type: Date,
    required: true,
    index: true,
  },
  // Action à effectuer à l'expiration
  expiration_action: {
    type: String,
    enum: ['delete', 'archive', 'notify', 'move_to_trash'],
    default: 'move_to_trash',
  },
  // Dossier de destination pour archivage
  archive_folder_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
  // Notifications envoyées
  notifications_sent: [{
    sent_at: Date,
    type: String, // 'warning', 'final'
  }],
  // Expiré
  is_expired: {
    type: Boolean,
    default: false,
    index: true,
  },
  expired_at: {
    type: Date,
    default: null,
  },
  // Créé automatiquement ou manuellement
  auto_created: {
    type: Boolean,
    default: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index pour requêtes fréquentes
fileExpirationSchema.index({ expires_at: 1, is_expired: 1 });
fileExpirationSchema.index({ user_id: 1, expires_at: 1 });

// TTL index pour nettoyage automatique (supprimer après 30 jours d'expiration)
fileExpirationSchema.index({ expired_at: 1 }, { expireAfterSeconds: 2592000 });

const FileExpiration = mongoose.model('FileExpiration', fileExpirationSchema);

module.exports = FileExpiration;


