/**
 * Modèle pour les équipes/organisations
 * Permet la gestion multi-tenant et multi-équipes
 */

const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  members: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member',
    },
    joined_at: {
      type: Date,
      default: Date.now,
    },
    invited_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  settings: {
    max_members: {
      type: Number,
      default: 10,
    },
    quota_limit: {
      type: Number,
      default: 100 * 1024 * 1024 * 1024, // 100 Go par défaut
    },
    quota_used: {
      type: Number,
      default: 0,
    },
    allow_public_sharing: {
      type: Boolean,
      default: true,
    },
  },
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

// Index pour les requêtes fréquentes
teamSchema.index({ owner_id: 1 });
teamSchema.index({ 'members.user_id': 1 });
teamSchema.index({ slug: 1 });

// Méthode pour vérifier les permissions
teamSchema.methods.hasPermission = function(userId, permission = 'read') {
  if (!userId) return false;

  // Propriétaire a tous les droits
  if (this.owner_id.toString() === userId.toString()) {
    return true;
  }

  // Vérifier les permissions du membre
  const member = this.members.find(m => m.user_id.toString() === userId.toString());
  if (!member) return false;

  const permissionLevels = { viewer: 1, member: 2, admin: 3, owner: 4 };
  const requiredLevel = permissionLevels[permission] || 1;
  const userLevel = permissionLevels[member.role] || 0;

  return userLevel >= requiredLevel;
};

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;


