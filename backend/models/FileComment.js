/**
 * Modèle pour les commentaires sur fichiers (différent des commentaires sur notes)
 */
const mongoose = require('mongoose');

const fileCommentSchema = new mongoose.Schema({
  file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  // Position dans le fichier (pour fichiers texte, PDF, etc.)
  position: {
    page: Number,
    line: Number,
    start: Number,
    end: Number,
    x: Number,
    y: Number,
  },
  // Commentaire parent (pour les réponses)
  parent_comment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FileComment',
    default: null,
  },
  // Mentions d'utilisateurs
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Résolu
  resolved: {
    type: Boolean,
    default: false,
  },
  resolved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  resolved_at: {
    type: Date,
    default: null,
  },
  // Réactions
  reactions: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    emoji: {
      type: String,
      maxlength: 10,
    },
  }],
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index pour requêtes fréquentes
fileCommentSchema.index({ file_id: 1, created_at: -1 });
fileCommentSchema.index({ file_id: 1, parent_comment_id: 1 });
fileCommentSchema.index({ user_id: 1, created_at: -1 });

const FileComment = mongoose.model('FileComment', fileCommentSchema);

module.exports = FileComment;


