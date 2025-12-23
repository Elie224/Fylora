/**
 * Service pour la synchronisation hors ligne
 */
import apiClient from './api';

export const offlineSyncService = {
  /**
   * Ajouter une action à la file de synchronisation
   */
  async addSyncAction(actionType, resourceType, resourceId, data, fileData) {
    const response = await apiClient.post('/offline-sync/actions', {
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      data,
      file_data: fileData ? btoa(fileData) : undefined,
    });
    return response.data;
  },

  /**
   * Lister les actions en attente
   */
  async listPendingSyncs() {
    const response = await apiClient.get('/offline-sync/pending');
    return response.data;
  },

  /**
   * Obtenir les statistiques de synchronisation
   */
  async getSyncStats() {
    const response = await apiClient.get('/offline-sync/stats');
    return response.data;
  },

  /**
   * Marquer une action comme synchronisée
   */
  async markSynced(actionId) {
    const response = await apiClient.post(`/offline-sync/${actionId}/synced`);
    return response.data;
  },

  /**
   * Marquer une action comme échouée
   */
  async markFailed(actionId, errorMessage) {
    const response = await apiClient.post(`/offline-sync/${actionId}/failed`, {
      error_message: errorMessage,
    });
    return response.data;
  },
};


