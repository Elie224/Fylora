/**
 * Contrôleur pour la synchronisation hors ligne
 */
const OfflineSync = require('../models/OfflineSync');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Ajouter une action à la file de synchronisation
 */
exports.addSyncAction = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { action_type, resource_type, resource_id, data, file_data } = req.body;

    if (!action_type || !resource_type) {
      return errorResponse(res, 'action_type and resource_type are required', 400);
    }

    const syncAction = await OfflineSync.create({
      user_id: userId,
      action_type,
      resource_type,
      resource_id,
      data: data || {},
      file_data: file_data ? Buffer.from(file_data, 'base64') : undefined,
      status: 'pending',
    });

    logger.logInfo('Offline sync action added', { userId, action_id: syncAction._id });

    return successResponse(res, { sync_action: syncAction }, 201);
  } catch (error) {
    logger.logError(error, { context: 'addSyncAction' });
    next(error);
  }
};

/**
 * Lister les actions en attente de synchronisation
 */
exports.listPendingSyncs = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const syncs = await OfflineSync.find({
      user_id: userId,
      status: { $in: ['pending', 'syncing'] },
    })
      .sort({ created_at: 1 })
      .lean();

    return successResponse(res, {
      syncs,
      total: syncs.length,
    });
  } catch (error) {
    logger.logError(error, { context: 'listPendingSyncs' });
    next(error);
  }
};

/**
 * Marquer une action comme synchronisée
 */
exports.markSynced = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const syncAction = await OfflineSync.findOne({ _id: id, user_id: userId });
    if (!syncAction) {
      return errorResponse(res, 'Sync action not found', 404);
    }

    syncAction.status = 'completed';
    syncAction.synced_at = new Date();
    await syncAction.save();

    logger.logInfo('Sync action marked as completed', { userId, action_id: id });

    return successResponse(res, { message: 'Sync action marked as completed' });
  } catch (error) {
    logger.logError(error, { context: 'markSynced' });
    next(error);
  }
};

/**
 * Marquer une action comme échouée
 */
exports.markFailed = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { error_message } = req.body;

    const syncAction = await OfflineSync.findOne({ _id: id, user_id: userId });
    if (!syncAction) {
      return errorResponse(res, 'Sync action not found', 404);
    }

    syncAction.status = 'failed';
    syncAction.error_message = error_message;
    syncAction.retry_count += 1;

    // Si on n'a pas atteint le maximum de tentatives, remettre en pending
    if (syncAction.retry_count < syncAction.max_retries) {
      syncAction.status = 'pending';
    }

    await syncAction.save();

    logger.logInfo('Sync action marked as failed', { userId, action_id: id, retry_count: syncAction.retry_count });

    return successResponse(res, {
      message: 'Sync action marked as failed',
      retry_count: syncAction.retry_count,
      will_retry: syncAction.status === 'pending',
    });
  } catch (error) {
    logger.logError(error, { context: 'markFailed' });
    next(error);
  }
};

/**
 * Obtenir les statistiques de synchronisation
 */
exports.getSyncStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const stats = await OfflineSync.aggregate([
      { $match: { user_id: userId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = {};
    stats.forEach(stat => {
      statsMap[stat._id] = stat.count;
    });

    return successResponse(res, {
      pending: statsMap.pending || 0,
      syncing: statsMap.syncing || 0,
      completed: statsMap.completed || 0,
      failed: statsMap.failed || 0,
    });
  } catch (error) {
    logger.logError(error, { context: 'getSyncStats' });
    next(error);
  }
};


