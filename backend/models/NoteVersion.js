/**
 * Modèle pour les versions des notes
 */
const mongoose = require('mongoose');

const noteVersionSchema = new mongoose.Schema({
  note_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    required: true,
    index: true,
  },
  version_number: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    default: '',
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: false,
});

// Index pour les requêtes fréquentes
noteVersionSchema.index({ note_id: 1, version_number: -1 });
noteVersionSchema.index({ note_id: 1, created_at: -1 });

const NoteVersion = mongoose.model('NoteVersion', noteVersionSchema);

module.exports = NoteVersion;





