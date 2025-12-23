/**
 * Service pour gérer les templates de notes
 */
import apiClient from './api';

export const noteTemplatesService = {
  /**
   * Créer un template
   */
  async createTemplate(name, description, content, category = 'general', isPublic = false) {
    const response = await apiClient.post('/note-templates', {
      name,
      description,
      content,
      category,
      is_public: isPublic,
    });
    return response.data;
  },

  /**
   * Lister les templates
   */
  async listTemplates(category = null) {
    const response = await apiClient.get('/note-templates', {
      params: category ? { category } : {},
    });
    return response.data;
  },

  /**
   * Créer une note depuis un template
   */
  async createNoteFromTemplate(templateId, title = null, folderId = null) {
    const response = await apiClient.post(`/note-templates/${templateId}/create-note`, {
      title,
      folder_id: folderId,
    });
    return response.data;
  },

  /**
   * Mettre à jour un template
   */
  async updateTemplate(templateId, updates) {
    const response = await apiClient.patch(`/note-templates/${templateId}`, updates);
    return response.data;
  },

  /**
   * Supprimer un template
   */
  async deleteTemplate(templateId) {
    const response = await apiClient.delete(`/note-templates/${templateId}`);
    return response.data;
  },
};





