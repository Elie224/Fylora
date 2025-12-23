/**
 * Service de planification pour les tâches automatiques
 * Utilise node-cron pour exécuter les sauvegardes programmées
 */
const cron = require('node-cron');
const ScheduledBackup = require('../models/ScheduledBackup');
const logger = require('../utils/logger');
const { executeBackup, calculateNextRun } = require('../controllers/scheduledBackupController');

let scheduledTasks = new Map();

/**
 * Démarrer le service de planification
 */
function startScheduler() {
  // Vérifier toutes les minutes les sauvegardes à exécuter
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const backups = await ScheduledBackup.find({
        is_active: true,
        next_run_at: { $lte: now },
      });

      for (const backup of backups) {
        try {
          logger.logInfo('Executing scheduled backup', { backup_id: backup._id });
          await executeBackup(backup, backup.user_id);

          // Calculer la prochaine exécution
          const nextRun = calculateNextRun(
            backup.schedule.frequency,
            backup.schedule.time,
            backup.schedule.day_of_week,
            backup.schedule.day_of_month
          );

          backup.last_run_at = now;
          backup.next_run_at = nextRun;
          await backup.save();
        } catch (error) {
          logger.logError(error, { context: 'scheduled backup execution', backup_id: backup._id });
        }
      }
    } catch (error) {
      logger.logError(error, { context: 'scheduler cron job' });
    }
  });

  logger.logInfo('Scheduler service started');
}


/**
 * Arrêter le service de planification
 */
function stopScheduler() {
  scheduledTasks.forEach((task) => task.stop());
  scheduledTasks.clear();
  logger.logInfo('Scheduler service stopped');
}

module.exports = {
  startScheduler,
  stopScheduler,
};

