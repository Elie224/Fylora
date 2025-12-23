/**
 * Modèle pour les rôles et permissions avancées
 * Système de rôles flexibles pour les utilisateurs et équipes
 */

const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  display_name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  permissions: {
    // Permissions fichiers
    files: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      share: { type: Boolean, default: false },
      download: { type: Boolean, default: false },
    },
    // Permissions dossiers
    folders: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      share: { type: Boolean, default: false },
    },
    // Permissions notes
    notes: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      share: { type: Boolean, default: false },
    },
    // Permissions administration
    admin: {
      manage_users: { type: Boolean, default: false },
      manage_teams: { type: Boolean, default: false },
      view_audit_logs: { type: Boolean, default: false },
      manage_settings: { type: Boolean, default: false },
    },
  },
  is_system: {
    type: Boolean,
    default: false, // Rôles système ne peuvent pas être supprimés
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index
roleSchema.index({ name: 1 });

const Role = mongoose.model('Role', roleSchema);

module.exports = Role;


