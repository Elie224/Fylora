/**
 * Modèle pour les sauvegardes automatiques programmées
 */

const mongoose = require('mongoose');

const scheduledBackupSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  schedule: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
    },
    time: {
      type: String, // Format HH:mm
      required: true,
    },
    day_of_week: {
      type: Number, // 0-6 (dimanche-samedi) pour weekly
      min: 0,
      max: 6,
    },
    day_of_month: {
      type: Number, // 1-31 pour monthly
      min: 1,
      max: 31,
    },
  },
  include_files: {
    type: Boolean,
    default: true,
  },
  include_folders: {
    type: Boolean,
    default: true,
  },
  include_notes: {
    type: Boolean,
    default: true,
  },
  folder_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
  }],
  file_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
  }],
  destination: {
    type: String,
    enum: ['local', 'external'], // Pour futures intégrations
    default: 'local',
  },
  last_run_at: Date,
  next_run_at: {
    type: Date,
    required: true,
    index: true,
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

// Index pour les requêtes de planification
scheduledBackupSchema.index({ next_run_at: 1, is_active: 1 });
scheduledBackupSchema.index({ user_id: 1, is_active: 1 });

const ScheduledBackup = mongoose.model('ScheduledBackup', scheduledBackupSchema);

module.exports = ScheduledBackup;


