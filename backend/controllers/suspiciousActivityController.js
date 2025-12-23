/**
 * Contrôleur pour les alertes de connexion suspecte
 */
const SuspiciousActivity = require('../models/SuspiciousActivity');
const ActivityLog = require('../models/ActivityLog');
const mongoose = require('mongoose');

// Obtenir les activités suspectes
async function getSuspiciousActivities(req, res, next) {
  try {
    const userId = req.user.id;
    const { severity, resolved } = req.query;

    const query = { user_id: userId };
    if (severity) query.severity = severity;
    if (resolved !== undefined) query.resolved = resolved === 'true';

    const activities = await SuspiciousActivity.find(query)
      .sort({ created_at: -1 })
      .limit(100)
      .lean();

    res.status(200).json({ data: activities });
  } catch (err) {
    next(err);
  }
}

// Marquer une activité comme résolue
async function resolveActivity(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const activity = await SuspiciousActivity.findOne({
      _id: id,
      user_id: userId,
    });

    if (!activity) {
      return res.status(404).json({
        error: { message: 'Suspicious activity not found' },
      });
    }

    activity.resolved = true;
    activity.resolved_at = new Date();
    activity.resolved_by = userId;
    await activity.save();

    res.status(200).json({
      data: activity,
      message: 'Activity resolved successfully',
    });
  } catch (err) {
    next(err);
  }
}

// Détecter les activités suspectes (appelé en arrière-plan)
async function detectSuspiciousActivity(userId, activityData) {
  try {
    const activities = [];

    // Détecter les connexions depuis des emplacements inhabituels
    if (activityData.ip_address) {
      const recentLogins = await ActivityLog.find({
        user_id: userId,
        action_type: 'login',
        ip_address: { $ne: activityData.ip_address },
      })
        .sort({ created_at: -1 })
        .limit(10)
        .lean();

      if (recentLogins.length > 0) {
        const usualIPs = [...new Set(recentLogins.map(l => l.ip_address))];
        if (!usualIPs.includes(activityData.ip_address)) {
          activities.push({
            user_id: userId,
            activity_type: 'unusual_login_location',
            severity: 'medium',
            details: {
              ip_address: activityData.ip_address,
              user_agent: activityData.user_agent,
              timestamp: new Date(),
            },
            baseline_comparison: {
              usual_locations: usualIPs,
            },
            action_taken: 'notified',
          });
        }
      }
    }

    // Détecter les tentatives de connexion multiples échouées
    const recentFailedLogins = await ActivityLog.find({
      user_id: userId,
      action_type: 'login',
      'details.success': false,
    })
      .sort({ created_at: -1 })
      .limit(5)
      .lean();

    if (recentFailedLogins.length >= 5) {
      activities.push({
        user_id: userId,
        activity_type: 'multiple_failed_attempts',
        severity: 'high',
        details: {
          ip_address: activityData.ip_address,
          attempt_count: recentFailedLogins.length,
          timestamp: new Date(),
        },
        action_taken: 'notified',
      });
    }

    // Enregistrer les activités détectées
    for (const activity of activities) {
      const suspiciousActivity = new SuspiciousActivity(activity);
      await suspiciousActivity.save();
    }

    return activities;
  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
    return [];
  }
}

module.exports = {
  getSuspiciousActivities,
  resolveActivity,
  detectSuspiciousActivity,
};


