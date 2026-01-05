/**
 * Service de Notifications de Quota
 * Crée des notifications non intrusives quand le quota atteint 80%, 90%, 95%
 */

const logger = require('../utils/logger');
const { createNotification } = require('../controllers/notificationsController');
const quotaService = require('./quotaService');
const planService = require('./planService');

// Seuils de notification (en pourcentage)
const NOTIFICATION_THRESHOLDS = [80, 90, 95];

// Cache pour éviter les notifications répétées (en mémoire)
const notificationCache = new Map(); // userId -> { last80: timestamp, last90: timestamp, last95: timestamp }

/**
 * Vérifier le quota et créer des notifications si nécessaire
 * @param {string} userId - ID utilisateur
 * @returns {Promise<void>}
 */
async function checkAndNotifyQuota(userId) {
  try {
    const quota = await quotaService.getUserQuota(userId);
    const percentage = quota.percentage;

    // Ne pas notifier si le quota est déjà dépassé (géré ailleurs)
    if (percentage >= 100) {
      return;
    }

    // Vérifier chaque seuil
    for (const threshold of NOTIFICATION_THRESHOLDS) {
      if (percentage >= threshold && percentage < threshold + 1) {
        // Vérifier si on a déjà notifié récemment (dans les dernières 24h)
        const cacheKey = `last${threshold}`;
        const userCache = notificationCache.get(userId) || {};
        const lastNotification = userCache[cacheKey];
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000; // 24 heures

        if (!lastNotification || (now - lastNotification) > oneDay) {
          // Créer la notification
          const plan = await getUserPlan(userId);
          const planName = planService.getPlan(plan)?.displayName || 'Gratuit';
          
          let title, message, severity;
          
          if (threshold === 80) {
            title = 'Stockage à 80%';
            message = `Votre espace de stockage atteint ${percentage.toFixed(1)}%. Pensez à mettre à niveau votre plan pour éviter d'être limité.`;
            severity = 'info';
          } else if (threshold === 90) {
            title = 'Stockage à 90%';
            message = `Attention ! Votre espace de stockage atteint ${percentage.toFixed(1)}%. Mettez à niveau votre plan pour continuer à utiliser Fylora sans interruption.`;
            severity = 'warning';
          } else if (threshold === 95) {
            title = 'Stockage critique (95%)';
            message = `Urgent ! Votre espace de stockage atteint ${percentage.toFixed(1)}%. Vous ne pourrez plus uploader de fichiers bientôt. Mettez à niveau maintenant !`;
            severity = 'error';
          }

          await createNotification(
            userId,
            'quota_warning',
            title,
            message,
            {
              resource_type: 'system',
              action_url: '/pricing',
              metadata: {
                percentage,
                threshold,
                severity,
                plan: planName,
              }
            }
          );

          // Mettre à jour le cache
          if (!notificationCache.has(userId)) {
            notificationCache.set(userId, {});
          }
          notificationCache.get(userId)[cacheKey] = now;

          logger.logInfo('Quota notification created', {
            userId,
            threshold,
            percentage
          });
        }
      }
    }
  } catch (error) {
    logger.logError(error, { context: 'checkAndNotifyQuota', userId });
  }
}

/**
 * Récupérer le plan d'un utilisateur
 * @param {string} userId - ID utilisateur
 * @returns {Promise<string>} Plan ID
 */
async function getUserPlan(userId) {
  const mongoose = require('mongoose');
  const User = mongoose.models.User || mongoose.model('User');
  const user = await User.findById(userId).select('plan').lean();
  return user?.plan || 'free';
}

/**
 * Vérifier le quota après une opération (upload, etc.)
 * @param {string} userId - ID utilisateur
 * @returns {Promise<void>}
 */
async function checkQuotaAfterOperation(userId) {
  // Exécuter en arrière-plan pour ne pas bloquer
  setImmediate(() => {
    checkAndNotifyQuota(userId).catch(err => {
      logger.logError(err, { context: 'checkQuotaAfterOperation', userId });
    });
  });
}

/**
 * Nettoyer le cache des notifications (appelé périodiquement)
 */
function clearNotificationCache() {
  const oneDay = 24 * 60 * 60 * 1000;
  const now = Date.now();
  
  for (const [userId, cache] of notificationCache.entries()) {
    let shouldRemove = true;
    for (const [key, timestamp] of Object.entries(cache)) {
      if (now - timestamp < oneDay) {
        shouldRemove = false;
        break;
      }
    }
    if (shouldRemove) {
      notificationCache.delete(userId);
    }
  }
}

// Nettoyer le cache toutes les heures
setInterval(clearNotificationCache, 60 * 60 * 1000);

module.exports = {
  checkAndNotifyQuota,
  checkQuotaAfterOperation,
};

