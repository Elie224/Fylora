/**
 * Service pour gérer les versions de fichiers
 */
import apiClient from './api';

export const fileVersionsService = {
  /**
   * Créer une nouvelle version d'un fichier
   */
  async createVersion(fileId) {
    const response = await apiClient.post(`/files/${fileId}/versions`);
    return response.data;
  },

  /**
   * Lister les versions d'un fichier
   */
  async listVersions(fileId) {
    const response = await apiClient.get(`/files/${fileId}/versions`);
    return response.data;
  },

  /**
   * Restaurer une version spécifique
   */
  async restoreVersion(fileId, versionId) {
    const response = await apiClient.post(`/files/${fileId}/versions/${versionId}/restore`);
    return response.data;
  },

  /**
   * Télécharger une version spécifique
   */
  async downloadVersion(fileId, versionId) {
    const response = await apiClient.get(`/files/${fileId}/versions/${versionId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};





