/**
 * Service pour gérer l'historique des activités
 */
import apiClient from './api';

export const activityService = {
  /**
   * Lister les activités
   */
  async listActivities(page = 1, limit = 50, filters = {}) {
    const response = await apiClient.get('/activity', {
      params: {
        page,
        limit,
        ...filters,
      },
    });
    return response.data;
  },

  /**
   * Obtenir les statistiques d'activité
   */
  async getStats(days = 30) {
    const response = await apiClient.get('/activity/stats', {
      params: { days },
    });
    return response.data;
  },

  /**
   * Exporter les activités en CSV
   */
  async exportActivities(filters = {}) {
    const response = await apiClient.get('/activity/export', {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  },
};





