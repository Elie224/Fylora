/**
 * Modèle pour l'accès par code temporaire
 */
const mongoose = require('mongoose');

const temporaryAccessSchema = new mongoose.Schema({
  // Code d'accès temporaire
  access_code: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  // Fichier ou dossier concerné
  resource_type: {
    type: String,
    enum: ['file', 'folder'],
    required: true,
  },
  resource_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  // Propriétaire
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Permissions
  permissions: [{
    type: String,
    enum: ['view', 'download', 'edit', 'share'],
  }],
  // Date d'expiration
  expires_at: {
    type: Date,
    required: true,
    index: true,
  },
  // Nombre maximum d'utilisations
  max_uses: {
    type: Number,
    default: null, // null = illimité
  },
  // Nombre d'utilisations actuelles
  use_count: {
    type: Number,
    default: 0,
  },
  // Utilisations enregistrées
  uses: [{
    used_at: Date,
    ip_address: String,
    user_agent: String,
  }],
  // Actif
  is_active: {
    type: Boolean,
    default: true,
    index: true,
  },
  // Mot de passe optionnel
  password_hash: {
    type: String,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index pour requêtes fréquentes
temporaryAccessSchema.index({ access_code: 1, is_active: 1, expires_at: 1 });
temporaryAccessSchema.index({ owner_id: 1, expires_at: 1 });

// TTL index pour nettoyage automatique
temporaryAccessSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const TemporaryAccess = mongoose.model('TemporaryAccess', temporaryAccessSchema);

module.exports = TemporaryAccess;


