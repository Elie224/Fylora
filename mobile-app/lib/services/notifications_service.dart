/// Service pour gérer les notifications
import '../services/api_service.dart';
import 'package:dio/dio.dart';

class NotificationsService {
  final ApiService _apiService = ApiService();

  /// Lister les notifications
  Future<Response> listNotifications({
    int page = 1,
    int limit = 50,
    bool? unreadOnly,
  }) async {
    final queryParams = {
      'page': page.toString(),
      'limit': limit.toString(),
      if (unreadOnly != null) 'unread_only': unreadOnly.toString(),
    };
    return await _apiService.get('/notifications', queryParameters: queryParams);
  }

  /// Marquer une notification comme lue
  Future<Response> markAsRead(String notificationId) async {
    return await _apiService.patch('/notifications/$notificationId/read');
  }

  /// Marquer toutes les notifications comme lues
  Future<Response> markAllAsRead() async {
    return await _apiService.post('/notifications/read-all');
  }

  /// Supprimer une notification
  Future<Response> deleteNotification(String notificationId) async {
    return await _apiService.delete('/notifications/$notificationId');
  }

  /// Obtenir le nombre de notifications non lues
  Future<Response> getUnreadCount() async {
    return await _apiService.get('/notifications/unread-count');
  }
}


