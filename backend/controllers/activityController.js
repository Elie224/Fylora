/**
 * Contrôleur pour gérer l'historique des activités
 */
const ActivityLog = require('../models/ActivityLog');
const { successResponse, errorResponse } = require('../utils/response');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Lister les activités de l'utilisateur
 */
exports.listActivities = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 50,
      action_type,
      resource_type,
      date_from,
      date_to,
    } = req.query;

    const query = { user_id: userId };

    if (action_type) {
      query.action_type = action_type;
    }

    if (resource_type) {
      query.resource_type = resource_type;
    }

    if (date_from || date_to) {
      query.created_at = {};
      if (date_from) {
        query.created_at.$gte = new Date(date_from);
      }
      if (date_to) {
        query.created_at.$lte = new Date(date_to);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activities = await ActivityLog.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('resource_id', 'name')
      .lean();

    const total = await ActivityLog.countDocuments(query);

    return successResponse(res, {
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.logError(error, { context: 'listActivities' });
    next(error);
  }
};

/**
 * Exporter les activités en CSV
 */
exports.exportActivities = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date_from, date_to } = req.query;

    const query = { user_id: userId };

    if (date_from || date_to) {
      query.created_at = {};
      if (date_from) {
        query.created_at.$gte = new Date(date_from);
      }
      if (date_to) {
        query.created_at.$lte = new Date(date_to);
      }
    }

    const activities = await ActivityLog.find(query)
      .sort({ created_at: -1 })
      .lean();

    // Générer le CSV
    const csvHeader = 'Date,Action,Type de ressource,ID ressource,Détails\n';
    const csvRows = activities.map((activity) => {
      const date = new Date(activity.created_at).toISOString();
      const details = JSON.stringify(activity.details || {}).replace(/"/g, '""');
      return `"${date}","${activity.action_type}","${activity.resource_type}","${activity.resource_id}","${details}"`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="activities_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.logError(error, { context: 'exportActivities' });
    next(error);
  }
};

/**
 * Obtenir les statistiques d'activité
 */
exports.getActivityStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - parseInt(days));

    const stats = await ActivityLog.aggregate([
      {
        $match: {
          user_id: userId,
          created_at: { $gte: dateFrom },
        },
      },
      {
        $group: {
          _id: '$action_type',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    const totalActivities = await ActivityLog.countDocuments({
      user_id: userId,
      created_at: { $gte: dateFrom },
    });

    return successResponse(res, {
      stats,
      total: totalActivities,
      period_days: parseInt(days),
    });
  } catch (error) {
    logger.logError(error, { context: 'getActivityStats' });
    next(error);
  }
};





