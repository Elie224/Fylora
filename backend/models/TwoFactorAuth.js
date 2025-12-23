/**
 * Modèle pour l'authentification à deux facteurs (2FA)
 * Utilise TOTP (Time-based One-Time Password)
 */

const mongoose = require('mongoose');

const twoFactorAuthSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  secret: {
    type: String,
    required: true,
  },
  enabled: {
    type: Boolean,
    default: false,
  },
  backup_codes: [{
    code: String,
    used: { type: Boolean, default: false },
    used_at: Date,
  }],
  created_at: {
    type: Date,
    default: Date.now,
  },
  last_used_at: Date,
}, {
  timestamps: true,
});

// Index pour les requêtes fréquentes
twoFactorAuthSchema.index({ user_id: 1, enabled: 1 });

const TwoFactorAuth = mongoose.model('TwoFactorAuth', twoFactorAuthSchema);

module.exports = TwoFactorAuth;


