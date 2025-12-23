/**
 * Contrôleur pour les plugins et intégrations externes
 */
const Plugin = require('../models/Plugin');
const UserPlugin = require('../models/UserPlugin');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Lister les plugins disponibles
 */
exports.listPlugins = async (req, res, next) => {
  try {
    const plugins = await Plugin.find({ is_active: true })
      .select('name display_name description type provider')
      .lean();

    return successResponse(res, {
      plugins,
      total: plugins.length,
    });
  } catch (error) {
    logger.logError(error, { context: 'listPlugins' });
    next(error);
  }
};

/**
 * Activer un plugin pour l'utilisateur
 */
exports.enablePlugin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { plugin_id, credentials, settings } = req.body;

    const plugin = await Plugin.findById(plugin_id);
    if (!plugin || !plugin.is_active) {
      return errorResponse(res, 'Plugin not found or inactive', 404);
    }

    // Vérifier si déjà activé
    let userPlugin = await UserPlugin.findOne({ user_id: userId, plugin_id });
    
    if (userPlugin) {
      // Mettre à jour
      if (credentials) userPlugin.credentials = credentials;
      if (settings) userPlugin.settings = settings;
      userPlugin.is_active = true;
      await userPlugin.save();
    } else {
      // Créer
      userPlugin = await UserPlugin.create({
        user_id: userId,
        plugin_id,
        credentials: credentials || {},
        settings: settings || {},
        is_active: true,
      });
    }

    logger.logInfo('Plugin enabled', { userId, plugin_id });

    return successResponse(res, {
      message: 'Plugin enabled successfully',
      user_plugin: userPlugin,
    });
  } catch (error) {
    logger.logError(error, { context: 'enablePlugin' });
    next(error);
  }
};

/**
 * Désactiver un plugin pour l'utilisateur
 */
exports.disablePlugin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const userPlugin = await UserPlugin.findOne({ _id: id, user_id: userId });
    if (!userPlugin) {
      return errorResponse(res, 'Plugin not found', 404);
    }

    userPlugin.is_active = false;
    await userPlugin.save();

    logger.logInfo('Plugin disabled', { userId, plugin_id: userPlugin.plugin_id });

    return successResponse(res, { message: 'Plugin disabled successfully' });
  } catch (error) {
    logger.logError(error, { context: 'disablePlugin' });
    next(error);
  }
};

/**
 * Lister les plugins activés par l'utilisateur
 */
exports.listUserPlugins = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const userPlugins = await UserPlugin.find({ user_id: userId })
      .populate('plugin_id', 'name display_name description type provider')
      .lean();

    return successResponse(res, {
      plugins: userPlugins,
      total: userPlugins.length,
    });
  } catch (error) {
    logger.logError(error, { context: 'listUserPlugins' });
    next(error);
  }
};

/**
 * Synchroniser avec un plugin externe
 */
exports.syncPlugin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const userPlugin = await UserPlugin.findOne({ _id: id, user_id: userId, is_active: true })
      .populate('plugin_id');
    
    if (!userPlugin) {
      return errorResponse(res, 'Plugin not found or inactive', 404);
    }

    // Logique de synchronisation selon le type de plugin
    // Cette partie nécessiterait des implémentations spécifiques pour chaque provider
    userPlugin.last_sync_at = new Date();
    await userPlugin.save();

    logger.logInfo('Plugin synced', { userId, plugin_id: userPlugin.plugin_id });

    return successResponse(res, {
      message: 'Plugin synchronized successfully',
      last_sync_at: userPlugin.last_sync_at,
    });
  } catch (error) {
    logger.logError(error, { context: 'syncPlugin' });
    next(error);
  }
};


