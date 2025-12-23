/**
 * Service pour les plugins et intégrations
 */
import apiClient from './api';

export const pluginsService = {
  /**
   * Lister les plugins disponibles
   */
  async listAvailablePlugins() {
    const response = await apiClient.get('/plugins/available');
    return response.data;
  },

  /**
   * Lister les plugins activés par l'utilisateur
   */
  async listUserPlugins() {
    const response = await apiClient.get('/plugins');
    return response.data;
  },

  /**
   * Activer un plugin
   */
  async enablePlugin(pluginId, credentials, settings) {
    const response = await apiClient.post('/plugins/enable', {
      plugin_id: pluginId,
      credentials,
      settings,
    });
    return response.data;
  },

  /**
   * Désactiver un plugin
   */
  async disablePlugin(userPluginId) {
    const response = await apiClient.post(`/plugins/${userPluginId}/disable`);
    return response.data;
  },

  /**
   * Synchroniser avec un plugin
   */
  async syncPlugin(userPluginId) {
    const response = await apiClient.post(`/plugins/${userPluginId}/sync`);
    return response.data;
  },
};


