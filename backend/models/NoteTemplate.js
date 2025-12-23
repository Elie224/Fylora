/**
 * Modèle pour les templates de notes
 */
const mongoose = require('mongoose');

const noteTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  content: {
    type: String,
    default: '',
  },
  category: {
    type: String,
    default: 'general',
    enum: ['general', 'meeting', 'project', 'personal', 'work', 'education'],
  },
  is_public: {
    type: Boolean,
    default: false,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  usage_count: {
    type: Number,
    default: 0,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Index pour les requêtes fréquentes
noteTemplateSchema.index({ category: 1, is_public: 1 });
noteTemplateSchema.index({ created_by: 1 });
noteTemplateSchema.index({ usage_count: -1 });

const NoteTemplate = mongoose.model('NoteTemplate', noteTemplateSchema);

module.exports = NoteTemplate;





