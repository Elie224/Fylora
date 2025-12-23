/// Service pour gérer l'activité
import '../services/api_service.dart';
import 'package:dio/dio.dart';

class ActivityService {
  final ApiService _apiService = ApiService();

  /// Lister les activités
  Future<Response> listActivities({
    int page = 1,
    int limit = 50,
    Map<String, dynamic>? filters,
  }) async {
    final queryParams = {
      'page': page.toString(),
      'limit': limit.toString(),
      if (filters != null) ...filters,
    };
    return await _apiService.get('/activity', queryParameters: queryParams);
  }

  /// Exporter les activités
  Future<Response> exportActivities(Map<String, dynamic>? filters) async {
    return await _apiService.post(
      '/activity/export',
      data: filters ?? {},
    );
  }

  /// Obtenir les statistiques d'activité
  Future<Response> getActivityStats() async {
    return await _apiService.get('/activity/stats');
  }
}
