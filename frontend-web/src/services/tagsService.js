/**
 * Service pour gérer les tags
 */
import apiClient from './api';

export const tagsService = {
  /**
   * Créer un tag
   */
  async createTag(name, color = '#2196F3') {
    const response = await apiClient.post('/tags', { name, color });
    return response.data;
  },

  /**
   * Lister les tags
   */
  async listTags() {
    const response = await apiClient.get('/tags');
    return response.data;
  },

  /**
   * Mettre à jour un tag
   */
  async updateTag(tagId, updates) {
    const response = await apiClient.patch(`/tags/${tagId}`, updates);
    return response.data;
  },

  /**
   * Supprimer un tag
   */
  async deleteTag(tagId) {
    const response = await apiClient.delete(`/tags/${tagId}`);
    return response.data;
  },

  /**
   * Ajouter des tags à une ressource
   */
  async addTagsToResource(resourceId, tagIds, resourceType) {
    const response = await apiClient.post(`/tags/resources/${resourceId}/add`, {
      tag_ids: tagIds,
      resource_type: resourceType,
    });
    return response.data;
  },

  /**
   * Retirer des tags d'une ressource
   */
  async removeTagsFromResource(resourceId, tagIds, resourceType) {
    const response = await apiClient.post(`/tags/resources/${resourceId}/remove`, {
      tag_ids: tagIds,
      resource_type: resourceType,
    });
    return response.data;
  },

  /**
   * Obtenir les ressources d'un tag
   */
  async getResourcesByTag(tagId) {
    const response = await apiClient.get(`/tags/${tagId}/resources`);
    return response.data;
  },
};





