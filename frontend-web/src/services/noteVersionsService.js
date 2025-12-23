/**
 * Service pour gérer les versions des notes
 */
import apiClient from './api';

export const noteVersionsService = {
  /**
   * Créer une version d'une note
   */
  async createVersion(noteId) {
    const response = await apiClient.post(`/notes/${noteId}/versions`);
    return response.data;
  },

  /**
   * Lister les versions d'une note
   */
  async listVersions(noteId) {
    const response = await apiClient.get(`/notes/${noteId}/versions`);
    return response.data;
  },

  /**
   * Restaurer une version
   */
  async restoreVersion(noteId, versionId) {
    const response = await apiClient.post(`/notes/${noteId}/versions/${versionId}/restore`);
    return response.data;
  },

  /**
   * Comparer deux versions
   */
  async compareVersions(noteId, version1Id, version2Id) {
    const response = await apiClient.get(`/notes/${noteId}/versions/compare`, {
      params: {
        version1_id: version1Id,
        version2_id: version2Id,
      },
    });
    return response.data;
  },
};





