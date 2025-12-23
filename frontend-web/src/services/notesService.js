/**
 * Service pour gérer les notes collaboratives
 */
import apiClient from './api';

export const notesService = {
  /**
   * Créer une nouvelle note
   */
  async createNote(title, folderId = null, content = '') {
    const response = await apiClient.post('/notes', {
      title,
      folder_id: folderId,
      content,
    });
    return response.data;
  },

  /**
   * Lister les notes
   */
  async listNotes(folderId = null, sharedWithMe = false) {
    const response = await apiClient.get('/notes', {
      params: {
        folder_id: folderId,
        shared_with_me: sharedWithMe,
      },
    });
    return response.data;
  },

  /**
   * Obtenir une note spécifique
   */
  async getNote(noteId) {
    const response = await apiClient.get(`/notes/${noteId}`);
    return response.data;
  },

  /**
   * Mettre à jour une note
   */
  async updateNote(noteId, updates) {
    const response = await apiClient.patch(`/notes/${noteId}`, updates);
    return response.data;
  },

  /**
   * Supprimer une note
   */
  async deleteNote(noteId) {
    const response = await apiClient.delete(`/notes/${noteId}`);
    return response.data;
  },

  /**
   * Restaurer une note
   */
  async restoreNote(noteId) {
    const response = await apiClient.post(`/notes/${noteId}/restore`);
    return response.data;
  },

  /**
   * Supprimer définitivement une note
   */
  async permanentDeleteNote(noteId) {
    const response = await apiClient.delete(`/notes/${noteId}/permanent`);
    return response.data;
  },

  /**
   * Partager une note avec un utilisateur
   */
  async shareNote(noteId, userId, permission = 'read') {
    const response = await apiClient.post(`/notes/${noteId}/share`, {
      user_id: userId,
      permission,
    });
    return response.data;
  },

  /**
   * Retirer le partage d'une note
   */
  async unshareNote(noteId, userId) {
    const response = await apiClient.post(`/notes/${noteId}/unshare`, {
      user_id: userId,
    });
    return response.data;
  },

  /**
   * Créer un lien public
   */
  async createPublicLink(noteId, options = {}) {
    const response = await apiClient.post(`/notes/${noteId}/public-link`, options);
    return response.data;
  },

  /**
   * Obtenir une note publique
   */
  async getPublicNote(token) {
    const response = await apiClient.get(`/notes/public/${token}`);
    return response.data;
  },
};





