/**
 * Modèle pour les tags
 * Permet d'organiser les fichiers avec des tags personnalisés
 */

const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  color: {
    type: String,
    default: '#2196F3',
    match: /^#[0-9A-Fa-f]{6}$/,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  file_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
  }],
  folder_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
  }],
  created_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index unique pour éviter les doublons de tags pour le même utilisateur
tagSchema.index({ user_id: 1, name: 1 }, { unique: true });

const Tag = mongoose.model('Tag', tagSchema);

module.exports = Tag;





