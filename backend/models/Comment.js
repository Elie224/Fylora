/**
 * Modèle pour les commentaires sur les notes
 */
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  note_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
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
  position: {
    // Position dans le document (offset de caractère ou sélection)
    start: {
      type: Number,
      default: 0,
    },
    end: {
      type: Number,
      default: 0,
    },
  },
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
  replies: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
  }],
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Index pour les requêtes fréquentes
commentSchema.index({ note_id: 1, resolved: 1, created_at: -1 });
commentSchema.index({ user_id: 1, created_at: -1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;





