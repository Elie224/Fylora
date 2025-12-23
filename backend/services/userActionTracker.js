/**
 * Tracking des actions utilisateur en temps réel
 * Mesure le temps réel par action, taux d'abandon, etc.
 */
const mongoose = require('mongoose');

class UserActionTracker {
  constructor() {
    this.actions = new Map(); // Cache temporaire
  }

  /**
   * Enregistrer une action utilisateur
   */
  async trackAction(userId, action, metadata = {}) {
    const actionData = {
      user_id: userId,
      action,
      metadata,
      timestamp: new Date(),
      duration: metadata.duration || null,
    };

    // Mettre en cache temporairement
    const key = `${userId}:${action}:${Date.now()}`;
    this.actions.set(key, actionData);

    // Sauvegarder en DB (async, ne pas bloquer)
    this.saveAction(actionData).catch(err => {
      console.error('Failed to save action:', err);
    });

    return actionData;
  }

  /**
   * Sauvegarder une action en DB
   */
  async saveAction(actionData) {
    try {
      const ActionLog = mongoose.models.UserAction || mongoose.model('UserAction', new mongoose.Schema({
        user_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        action: { type: String, required: true, index: true },
        metadata: { type: mongoose.Schema.Types.Mixed },
        duration: { type: Number },
        timestamp: { type: Date, default: Date.now, index: true },
      }, { timestamps: false }));

      await ActionLog.create(actionData);
    } catch (error) {
      // Ignorer les erreurs de sauvegarde
      console.warn('Could not save action log:', error.message);
    }
  }

  /**
   * Obtenir les statistiques d'actions
   */
  async getActionStats(action, timeRange = 24 * 60 * 60 * 1000) {
    const ActionLog = mongoose.models.UserAction;
    if (!ActionLog) {
      return null;
    }

    const since = new Date(Date.now() - timeRange);

    const stats = await ActionLog.aggregate([
      {
        $match: {
          action,
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          minDuration: { $min: '$duration' },
          maxDuration: { $max: '$duration' },
        },
      },
    ]);

    return stats[0] || { count: 0, avgDuration: 0, minDuration: 0, maxDuration: 0 };
  }

  /**
   * Obtenir les actions les plus lentes
   */
  async getSlowActions(limit = 10) {
    const ActionLog = mongoose.models.UserAction;
    if (!ActionLog) {
      return [];
    }

    const slowActions = await ActionLog.find({
      duration: { $exists: true, $gt: 1000 }, // Plus d'1 seconde
    })
      .sort({ duration: -1 })
      .limit(limit)
      .lean();

    return slowActions;
  }

  /**
   * Obtenir les features les plus utilisées
   */
  async getMostUsedFeatures(limit = 10, timeRange = 24 * 60 * 60 * 1000) {
    const ActionLog = mongoose.models.UserAction;
    if (!ActionLog) {
      return [];
    }

    const since = new Date(Date.now() - timeRange);

    const features = await ActionLog.aggregate([
      {
        $match: {
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    return features;
  }

  /**
   * Calculer le taux d'abandon
   */
  async getAbandonmentRate(action, timeRange = 24 * 60 * 60 * 1000) {
    const ActionLog = mongoose.models.UserAction;
    if (!ActionLog) {
      return null;
    }

    const since = new Date(Date.now() - timeRange);

    const [started, completed] = await Promise.all([
      ActionLog.countDocuments({
        action: `${action}:start`,
        timestamp: { $gte: since },
      }),
      ActionLog.countDocuments({
        action: `${action}:complete`,
        timestamp: { $gte: since },
      }),
    ]);

    if (started === 0) {
      return 0;
    }

    return (started - completed) / started;
  }
}

module.exports = new UserActionTracker();


