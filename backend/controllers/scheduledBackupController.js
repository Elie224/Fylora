/**
 * Contrôleur pour les sauvegardes automatiques programmées
 */
const ScheduledBackup = require('../models/ScheduledBackup');
const FileModel = require('../models/fileModel');
const FolderModel = require('../models/folderModel');
const Note = require('../models/Note');
const archiver = require('archiver');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const config = require('../config');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Créer une sauvegarde programmée
 */
exports.createScheduledBackup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      name,
      frequency,
      time,
      day_of_week,
      day_of_month,
      include_files,
      include_folders,
      include_notes,
      folder_ids,
      file_ids,
    } = req.body;

    if (!name || !frequency || !time) {
      return errorResponse(res, 'Name, frequency, and time are required', 400);
    }

    // Calculer la prochaine exécution
    const nextRunAt = calculateNextRun(frequency, time, day_of_week, day_of_month);

    const backup = await ScheduledBackup.create({
      user_id: userId,
      name: name.trim(),
      schedule: {
        frequency,
        time,
        day_of_week,
        day_of_month,
      },
      include_files: include_files !== false,
      include_folders: include_folders !== false,
      include_notes: include_notes !== false,
      folder_ids: folder_ids || [],
      file_ids: file_ids || [],
    });

    logger.logInfo('Scheduled backup created', { userId, backup_id: backup._id });

    return successResponse(res, { backup }, 201);
  } catch (error) {
    logger.logError(error, { context: 'createScheduledBackup' });
    next(error);
  }
};

/**
 * Calculer la prochaine date d'exécution
 */
function calculateNextRun(frequency, time, dayOfWeek, dayOfMonth) {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const nextRun = new Date(now);

  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    case 'weekly':
      const targetDay = dayOfWeek || 0; // 0 = dimanche
      const currentDay = nextRun.getDay();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd < 0 || (daysToAdd === 0 && nextRun <= now)) {
        daysToAdd += 7;
      }
      nextRun.setDate(nextRun.getDate() + daysToAdd);
      break;
    case 'monthly':
      const targetDayOfMonth = dayOfMonth || 1;
      nextRun.setDate(targetDayOfMonth);
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
  }

  return nextRun;
}

/**
 * Lister les sauvegardes programmées de l'utilisateur
 */
exports.listScheduledBackups = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const backups = await ScheduledBackup.find({ user_id: userId })
      .sort({ created_at: -1 })
      .lean();

    return successResponse(res, {
      backups,
      total: backups.length,
    });
  } catch (error) {
    logger.logError(error, { context: 'listScheduledBackups' });
    next(error);
  }
};

/**
 * Exécuter une sauvegarde manuellement
 */
exports.runBackup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const backup = await ScheduledBackup.findOne({ _id: id, user_id: userId });
    if (!backup) {
      return errorResponse(res, 'Backup not found', 404);
    }

    // Exécuter la sauvegarde
    const backupPath = await executeBackup(backup, userId);

    // Mettre à jour la date de dernière exécution
    backup.last_run_at = new Date();
    backup.next_run_at = calculateNextRun(
      backup.schedule.frequency,
      backup.schedule.time,
      backup.schedule.day_of_week,
      backup.schedule.day_of_month
    );
    await backup.save();

    logger.logInfo('Backup executed', { userId, backup_id: id });

    return successResponse(res, {
      message: 'Backup executed successfully',
      backup_path: backupPath,
    });
  } catch (error) {
    logger.logError(error, { context: 'runBackup' });
    next(error);
  }
};

/**
 * Exécuter une sauvegarde (exportée pour le scheduler)
 */
async function executeBackup(backup, userId) {
  const backupDir = path.join(config.upload.uploadDir, 'backups', `user_${userId}`);
  await fs.mkdir(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `${backup.name}_${timestamp}.zip`;
  const backupPath = path.join(backupDir, backupFileName);

  return new Promise(async (resolve, reject) => {
    try {
      const output = fsSync.createWriteStream(backupPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(backupPath));
      archive.on('error', reject);

      archive.pipe(output);

      const userDir = path.join(config.upload.uploadDir, `user_${userId}`);

      // Ajouter les fichiers
      if (backup.include_files) {
        if (backup.file_ids && backup.file_ids.length > 0) {
          // Ajouter des fichiers spécifiques
          for (const fileId of backup.file_ids) {
            const file = await FileModel.findById(fileId);
            if (file && file.owner_id.toString() === userId) {
              const filePath = path.join(userDir, file.file_path);
              try {
                await fs.access(filePath);
                archive.file(filePath, { name: `files/${file.name}` });
              } catch (err) {
                logger.logWarn(`File not found for backup: ${filePath}`);
              }
            }
          }
        } else {
          // Ajouter tous les fichiers de l'utilisateur
          const files = await FileModel.find({ owner_id: userId, is_deleted: false });
          for (const file of files) {
            const filePath = path.join(userDir, file.file_path);
            try {
              await fs.access(filePath);
              archive.file(filePath, { name: `files/${file.name}` });
            } catch (err) {
              logger.logWarn(`File not found for backup: ${filePath}`);
            }
          }
        }
      }

      // Ajouter les dossiers
      if (backup.include_folders) {
        if (backup.folder_ids && backup.folder_ids.length > 0) {
          // Ajouter des dossiers spécifiques
          for (const folderId of backup.folder_ids) {
            const folder = await FolderModel.findById(folderId);
            if (folder && folder.owner_id.toString() === userId) {
              // Logique pour ajouter le dossier et son contenu
              archive.directory(path.join(userDir, folder.path || ''), `folders/${folder.name}`);
            }
          }
        } else {
          // Ajouter tous les dossiers de l'utilisateur
          const folders = await FolderModel.find({ owner_id: userId, is_deleted: false });
          for (const folder of folders) {
            try {
              archive.directory(path.join(userDir, folder.path || ''), `folders/${folder.name}`);
            } catch (err) {
              logger.logWarn(`Folder not found for backup: ${folder.name}`);
            }
          }
        }
      }

      // Ajouter les notes
      if (backup.include_notes) {
        const notes = await Note.find({ owner_id: userId, is_deleted: false });
        const notesData = notes.map(note => ({
          id: note._id.toString(),
          title: note.title,
          content: note.content,
          created_at: note.created_at,
          updated_at: note.updated_at,
        }));
        archive.append(JSON.stringify(notesData, null, 2), { name: 'notes.json' });
      }

      archive.finalize();
    } catch (error) {
      reject(error);
    }
  });
}

// Exporter pour le scheduler
exports.executeBackup = executeBackup;
exports.calculateNextRun = calculateNextRun;

/**
 * Mettre à jour une sauvegarde programmée
 */
exports.updateScheduledBackup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    const backup = await ScheduledBackup.findOne({ _id: id, user_id: userId });
    if (!backup) {
      return errorResponse(res, 'Backup not found', 404);
    }

    // Mettre à jour les champs
    if (updates.name) backup.name = updates.name.trim();
    if (updates.schedule) {
      backup.schedule = { ...backup.schedule, ...updates.schedule };
      backup.next_run_at = calculateNextRun(
        backup.schedule.frequency,
        backup.schedule.time,
        backup.schedule.day_of_week,
        backup.schedule.day_of_month
      );
    }
    if (updates.include_files !== undefined) backup.include_files = updates.include_files;
    if (updates.include_folders !== undefined) backup.include_folders = updates.include_folders;
    if (updates.include_notes !== undefined) backup.include_notes = updates.include_notes;
    if (updates.is_active !== undefined) backup.is_active = updates.is_active;

    await backup.save();

    logger.logInfo('Scheduled backup updated', { userId, backup_id: id });

    return successResponse(res, {
      message: 'Backup updated successfully',
      backup,
    });
  } catch (error) {
    logger.logError(error, { context: 'updateScheduledBackup' });
    next(error);
  }
};

/**
 * Supprimer une sauvegarde programmée
 */
exports.deleteScheduledBackup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const backup = await ScheduledBackup.findOne({ _id: id, user_id: userId });
    if (!backup) {
      return errorResponse(res, 'Backup not found', 404);
    }

    await ScheduledBackup.deleteOne({ _id: id });

    logger.logInfo('Scheduled backup deleted', { userId, backup_id: id });

    return successResponse(res, { message: 'Backup deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'deleteScheduledBackup' });
    next(error);
  }
};

