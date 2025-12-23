/**
 * Service pour les sauvegardes automatiques programmées
 */
import apiClient from './api';

export const scheduledBackupsService = {
  /**
   * Créer une sauvegarde programmée
   */
  async createBackup(data) {
    const response = await apiClient.post('/backups', data);
    return response.data;
  },

  /**
   * Lister les sauvegardes programmées
   */
  async listBackups() {
    const response = await apiClient.get('/backups');
    return response.data;
  },

  /**
   * Exécuter une sauvegarde manuellement
   */
  async runBackup(backupId) {
    const response = await apiClient.post(`/backups/${backupId}/run`);
    return response.data;
  },

  /**
   * Mettre à jour une sauvegarde programmée
   */
  async updateBackup(backupId, updates) {
    const response = await apiClient.patch(`/backups/${backupId}`, updates);
    return response.data;
  },

  /**
   * Supprimer une sauvegarde programmée
   */
  async deleteBackup(backupId) {
    const response = await apiClient.delete(`/backups/${backupId}`);
    return response.data;
  },
};


