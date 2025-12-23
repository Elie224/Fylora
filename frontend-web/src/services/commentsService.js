/**
 * Service pour gérer les commentaires sur les notes
 */
import apiClient from './api';

export const commentsService = {
  /**
   * Créer un commentaire
   */
  async createComment(noteId, content, position = null) {
    const response = await apiClient.post(`/comments/notes/${noteId}/comments`, {
      content,
      position,
    });
    return response.data;
  },

  /**
   * Lister les commentaires d'une note
   */
  async listComments(noteId, filters = {}) {
    const response = await apiClient.get(`/comments/notes/${noteId}/comments`, {
      params: filters,
    });
    return response.data;
  },

  /**
   * Répondre à un commentaire
   */
  async replyToComment(commentId, content) {
    const response = await apiClient.post(`/comments/comments/${commentId}/reply`, {
      content,
    });
    return response.data;
  },

  /**
   * Résoudre un commentaire
   */
  async resolveComment(commentId) {
    const response = await apiClient.patch(`/comments/comments/${commentId}/resolve`);
    return response.data;
  },

  /**
   * Supprimer un commentaire
   */
  async deleteComment(commentId) {
    const response = await apiClient.delete(`/comments/comments/${commentId}`);
    return response.data;
  },
};





