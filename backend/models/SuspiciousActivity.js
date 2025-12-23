/**
 * Modèle pour les alertes de connexion suspecte
 */
const mongoose = require('mongoose');

const suspiciousActivitySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  activity_type: {
    type: String,
    required: true,
    enum: [
      'unusual_login_location',
      'unusual_login_time',
      'multiple_failed_attempts',
      'unusual_file_access',
      'unusual_download_pattern',
      'suspicious_ip',
      'account_takeover_attempt',
      'data_exfiltration_attempt',
    ],
    index: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true,
  },
  // Détails de l'activité
  details: {
    ip_address: String,
    user_agent: String,
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    timestamp: Date,
    resource_id: mongoose.Schema.Types.ObjectId,
    resource_type: String,
    description: String,
  },
  // Comparaison avec le comportement normal
  baseline_comparison: {
    usual_locations: [String],
    usual_times: [String],
    usual_devices: [String],
  },
  // Action prise
  action_taken: {
    type: String,
    enum: ['none', 'notified', 'blocked', 'password_reset_required', 'account_locked'],
    default: 'notified',
  },
  // Notifié à l'utilisateur
  notified: {
    type: Boolean,
    default: false,
  },
  notified_at: {
    type: Date,
    default: null,
  },
  // Résolu
  resolved: {
    type: Boolean,
    default: false,
    index: true,
  },
  resolved_at: {
    type: Date,
    default: null,
  },
  resolved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Index pour requêtes fréquentes
suspiciousActivitySchema.index({ user_id: 1, resolved: 1, created_at: -1 });
suspiciousActivitySchema.index({ severity: 1, resolved: 1, created_at: -1 });
suspiciousActivitySchema.index({ activity_type: 1, created_at: -1 });

// TTL index pour nettoyage automatique après 90 jours
suspiciousActivitySchema.index({ created_at: 1 }, { expireAfterSeconds: 7776000 });

const SuspiciousActivity = mongoose.model('SuspiciousActivity', suspiciousActivitySchema);

module.exports = SuspiciousActivity;


