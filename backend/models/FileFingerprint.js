/**
 * Modèle pour l'empreinte unique de fichier
 * Hash intelligent pour détecter les doublons et suivre les fichiers
 */
const mongoose = require('mongoose');

const fileFingerprintSchema = new mongoose.Schema({
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
  // Hash MD5 du contenu du fichier
  content_hash: {
    type: String,
    required: true,
    index: true,
  },
  // Hash SHA256 pour sécurité renforcée
  sha256_hash: {
    type: String,
    required: true,
    index: true,
  },
  // Hash partiel pour détection rapide de doublons
  quick_hash: {
    type: String,
    index: true,
  },
  // Métadonnées du fichier hashées
  metadata_hash: String,
  // Taille du fichier
  file_size: {
    type: Number,
    required: true,
  },
  // Type MIME
  mime_type: {
    type: String,
    index: true,
  },
  // Date de création du hash
  created_at: {
    type: Date,
    default: Date.now,
  },
  // Date de dernière vérification
  verified_at: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index pour détection de doublons
fileFingerprintSchema.index({ content_hash: 1, user_id: 1 });
fileFingerprintSchema.index({ sha256_hash: 1 });

const FileFingerprint = mongoose.model('FileFingerprint', fileFingerprintSchema);

module.exports = FileFingerprint;


