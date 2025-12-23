/// Service pour le dashboard
import '../services/api_service.dart';

class DashboardService {
  final ApiService _api = ApiService();

  /// Obtenir les statistiques du dashboard
  Future<Map<String, dynamic>?> getStats() async {
    try {
      final response = await _api.get(
        '/dashboard',
        useCache: true,
        cacheTTL: const Duration(minutes: 2),
      );

      if (response.statusCode == 200) {
        return response.data['data'];
      }
      return null;
    } catch (e) {
      print('Error getting dashboard stats: $e');
      return null;
    }
  }
}





