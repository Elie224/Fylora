/**
 * Modèle pour les notes collaboratives (style Google Docs)
 */
const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  },
  content: {
    type: String,
    default: '',
  },
  owner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  folder_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true,
  },
  shared_with: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    permission: {
      type: String,
      enum: ['read', 'write', 'admin'],
      default: 'read',
    },
    added_at: {
      type: Date,
      default: Date.now,
    },
  }],
  is_public: {
    type: Boolean,
    default: false,
  },
  public_token: {
    type: String,
    default: undefined, // undefined plutôt que null pour éviter les problèmes d'index unique
  },
  version: {
    type: Number,
    default: 1,
  },
  last_modified_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  is_deleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updated_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Index pour les requêtes fréquentes
noteSchema.index({ owner_id: 1, is_deleted: 1, created_at: -1 });
noteSchema.index({ folder_id: 1, is_deleted: 1 });
noteSchema.index({ 'shared_with.user_id': 1, is_deleted: 1 });
// Index unique sparse pour public_token (permet plusieurs null) - créé manuellement via script
// noteSchema.index({ public_token: 1 }, { unique: true, sparse: true });

// Méthode pour vérifier les permissions
noteSchema.methods.hasPermission = function(userId, permission = 'read') {
  if (!userId) {
    return false;
  }

  const mongoose = require('mongoose');
  
  // Normaliser userId en ObjectId si nécessaire
  let userIdObj;
  try {
    if (mongoose.Types.ObjectId.isValid(userId)) {
      userIdObj = new mongoose.Types.ObjectId(userId);
    } else {
      userIdObj = userId;
    }
  } catch (e) {
    userIdObj = userId;
  }

  // Normaliser owner_id pour la comparaison
  let ownerId;
  if (this.owner_id?._id) {
    ownerId = this.owner_id._id;
  } else if (this.owner_id) {
    ownerId = this.owner_id;
  } else {
    return false;
  }

  // Convertir en string pour comparaison fiable
  const ownerIdStr = ownerId.toString();
  const userIdStr = userIdObj.toString();
  
  // Propriétaire a tous les droits
  if (ownerIdStr === userIdStr) {
    return true;
  }

  // Vérifier les permissions partagées
  const share = this.shared_with.find(s => {
    if (!s.user_id) return false;
    
    let shareUserId;
    if (s.user_id._id) {
      shareUserId = s.user_id._id;
    } else {
      shareUserId = s.user_id;
    }
    
    return shareUserId.toString() === userIdStr;
  });
  
  if (!share) {
    return false;
  }

  const permissionLevels = { read: 1, write: 2, admin: 3 };
  const requiredLevel = permissionLevels[permission] || 1;
  const userLevel = permissionLevels[share.permission] || 0;

  return userLevel >= requiredLevel;
};

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;


