/**
 * Modèle pour les métadonnées enrichies des fichiers
 * OCR, résumé, mots-clés, détection de sensibilité, etc.
 */
const mongoose = require('mongoose');

const fileMetadataSchema = new mongoose.Schema({
  file_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
    unique: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // OCR - Texte extrait des images/PDF
  ocr_text: {
    type: String,
    default: null,
  },
  ocr_confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: null,
  },
  ocr_processed_at: {
    type: Date,
    default: null,
  },
  // Résumé automatique
  summary: {
    type: String,
    maxlength: 2000,
    default: null,
  },
  summary_generated_at: {
    type: Date,
    default: null,
  },
  // Mots-clés extraits
  keywords: [{
    keyword: String,
    confidence: Number,
    source: String, // 'auto', 'ocr', 'ml', 'user'
  }],
  // Détection de fichiers sensibles
  sensitive_data_detected: {
    type: Boolean,
    default: false,
    index: true,
  },
  sensitive_types: [{
    type: String,
    enum: ['credit_card', 'ssn', 'email', 'phone', 'address', 'password', 'api_key', 'other'],
  }],
  sensitivity_score: {
    type: Number,
    min: 0,
    max: 1,
    default: 0,
  },
  // Suggestion de chiffrement
  encryption_recommended: {
    type: Boolean,
    default: false,
  },
  encryption_reason: {
    type: String,
    maxlength: 500,
  },
  // Langue détectée
  detected_language: {
    type: String,
    default: null,
  },
  // Nombre de pages (pour PDF)
  page_count: {
    type: Number,
    default: null,
  },
  // Dimensions (pour images)
  dimensions: {
    width: Number,
    height: Number,
  },
  // Durée (pour vidéos/audio)
  duration: {
    type: Number, // en secondes
    default: null,
  },
  // Métadonnées EXIF (pour images)
  exif_data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Métadonnées personnalisées
  custom_metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index pour recherches
fileMetadataSchema.index({ user_id: 1, sensitive_data_detected: 1 });
fileMetadataSchema.index({ 'keywords.keyword': 'text' });
fileMetadataSchema.index({ ocr_text: 'text' });

const FileMetadata = mongoose.model('FileMetadata', fileMetadataSchema);

module.exports = FileMetadata;


