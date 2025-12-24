/// Service pour gérer les fonctionnalités d'administration
import '../services/api_service.dart';
import 'package:dio/dio.dart';

class AdminService {
  final ApiService _apiService = ApiService();

  /// Obtenir les statistiques d'administration
  Future<Response> getStats() async {
    return await _apiService.get('/admin/stats');
  }

  /// Lister les utilisateurs avec pagination
  Future<Response> listUsers({
    int page = 1,
    int limit = 20,
    String? search,
  }) async {
    final queryParams = {
      'page': page.toString(),
      'limit': limit.toString(),
      if (search != null && search.isNotEmpty) 'search': search,
    };
    return await _apiService.get('/admin/users', queryParameters: queryParams);
  }

  /// Obtenir les détails d'un utilisateur
  Future<Response> getUser(String userId) async {
    return await _apiService.get('/admin/users/$userId');
  }

  /// Mettre à jour un utilisateur
  Future<Response> updateUser(String userId, {
    String? displayName,
    int? quotaLimit,
    bool? isActive,
    bool? isAdmin,
  }) async {
    final data = <String, dynamic>{};
    if (displayName != null) data['display_name'] = displayName;
    if (quotaLimit != null) data['quota_limit'] = quotaLimit;
    if (isActive != null) data['is_active'] = isActive;
    if (isAdmin != null) data['is_admin'] = isAdmin;
    
    return await _apiService.put('/admin/users/$userId', data: data);
  }

  /// Supprimer un utilisateur
  Future<Response> deleteUser(String userId) async {
    return await _apiService.delete('/admin/users/$userId');
  }
}




