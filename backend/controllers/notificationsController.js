/**
 * Contrôleur pour gérer les notifications
 */
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/response');
const { AppError } = require('../middlewares/errorHandler');
const logger = require('../utils/logger');

/**
 * Créer une notification
 */
exports.createNotification = async (userId, type, title, message, options = {}) => {
  try {
    const notification = await Notification.create({
      user_id: userId,
      type,
      title,
      message,
      resource_type: options.resource_type || null,
      resource_id: options.resource_id || null,
      action_url: options.action_url || null,
      metadata: options.metadata || {},
    });

    logger.logInfo('Notification created', { userId, type, notification_id: notification._id });
    return notification;
  } catch (error) {
    logger.logError(error, { context: 'createNotification' });
    throw error;
  }
};

/**
 * Lister les notifications de l'utilisateur
 */
exports.listNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, unread_only = false } = req.query;

    const query = { user_id: userId };
    if (unread_only === 'true') {
      query.is_read = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const notifications = await Notification.find(query)
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user_id: userId, is_read: false });

    return successResponse(res, {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      unread_count: unreadCount,
    });
  } catch (error) {
    logger.logError(error, { context: 'listNotifications' });
    next(error);
  }
};

/**
 * Marquer une notification comme lue
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user_id: userId },
      { is_read: true, read_at: new Date() },
      { new: true }
    );

    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    return successResponse(res, { notification });
  } catch (error) {
    logger.logError(error, { context: 'markAsRead' });
    next(error);
  }
};

/**
 * Marquer toutes les notifications comme lues
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { user_id: userId, is_read: false },
      { is_read: true, read_at: new Date() }
    );

    return successResponse(res, {
      message: 'All notifications marked as read',
      updated_count: result.modifiedCount,
    });
  } catch (error) {
    logger.logError(error, { context: 'markAllAsRead' });
    next(error);
  }
};

/**
 * Supprimer une notification
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      user_id: userId,
    });

    if (!notification) {
      return errorResponse(res, 'Notification not found', 404);
    }

    return successResponse(res, { message: 'Notification deleted successfully' });
  } catch (error) {
    logger.logError(error, { context: 'deleteNotification' });
    next(error);
  }
};

/**
 * Obtenir le nombre de notifications non lues
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const count = await Notification.countDocuments({
      user_id: userId,
      is_read: false,
    });

    return successResponse(res, { unread_count: count });
  } catch (error) {
    logger.logError(error, { context: 'getUnreadCount' });
    next(error);
  }
};





