/**
 * Service pour gérer les notifications
 */
import apiClient from './api';

export const notificationsService = {
  /**
   * Lister les notifications
   */
  async listNotifications(page = 1, limit = 20, unreadOnly = false) {
    const response = await apiClient.get('/notifications', {
      params: { page, limit, unread_only: unreadOnly },
    });
    return response.data;
  },

  /**
   * Obtenir le nombre de notifications non lues
   */
  async getUnreadCount() {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },

  /**
   * Marquer une notification comme lue
   */
  async markAsRead(notificationId) {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Marquer toutes les notifications comme lues
   */
  async markAllAsRead() {
    const response = await apiClient.post('/notifications/mark-all-read');
    return response.data;
  },

  /**
   * Supprimer une notification
   */
  async deleteNotification(notificationId) {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  },
};





