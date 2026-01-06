/**
 * Controller RGPD / GDPR
 */

const gdprService = require('../services/gdprService');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

/**
 * Exporter les données utilisateur
 */
async function exportData(req, res, next) {
  try {
    const userId = req.user.id;

    const exportFile = await gdprService.generateExportFile(userId);

    // Envoyer le fichier JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${exportFile.filename}"`);
    res.send(exportFile.content);

    logger.logInfo('User data export requested', {
      userId,
    });
  } catch (err) {
    logger.logError(err, {
      context: 'gdpr_export_controller',
      userId: req.user?.id,
    });
    next(new AppError('Failed to export user data', 500));
  }
}

/**
 * Supprimer toutes les données utilisateur
 */
async function deleteData(req, res, next) {
  try {
    const userId = req.user.id;
    const { proofOfDeletion } = req.body;

    // Confirmation requise
    if (!req.body.confirm || req.body.confirm !== 'DELETE') {
      return next(new AppError('Confirmation required. Send { confirm: "DELETE" }', 400));
    }

    const deletionLog = await gdprService.deleteUserData(userId, proofOfDeletion);

    res.status(200).json({
      success: true,
      message: 'All user data has been deleted',
      deletionLog,
    });

    logger.logInfo('User data deletion requested', {
      userId,
    });
  } catch (err) {
    logger.logError(err, {
      context: 'gdpr_delete_controller',
      userId: req.user?.id,
    });
    next(new AppError('Failed to delete user data', 500));
  }
}

module.exports = {
  exportData,
  deleteData,
};
