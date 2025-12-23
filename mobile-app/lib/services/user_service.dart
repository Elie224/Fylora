/// Service pour gérer les utilisateurs
import 'dart:io';
import '../services/api_service.dart';
import '../utils/security.dart';

class UserService {
  final ApiService _api = ApiService();

  /// Obtenir les informations de l'utilisateur actuel
  Future<Map<String, dynamic>?> getCurrentUser() async {
    try {
      final response = await _api.get('/users/me', useCache: false);
      if (response.statusCode == 200) {
        return response.data['data'];
      }
      return null;
    } catch (e) {
      print('Error getting current user: $e');
      return null;
    }
  }

  /// Mettre à jour le profil
  Future<Map<String, dynamic>?> updateProfile({
    String? email,
    String? displayName,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (email != null && isValidEmail(email)) {
        data['email'] = email;
      }
      if (displayName != null) {
        data['display_name'] = displayName;
      }

      final response = await _api.put('/users/me', data: data);
      _api.invalidateCacheKey('/users/me');
      
      if (response.statusCode == 200) {
        return response.data['data'];
      }
      return null;
    } catch (e) {
      print('Error updating profile: $e');
      return null;
    }
  }

  /// Changer le mot de passe
  Future<bool> changePassword(
    String currentPassword,
    String newPassword,
  ) async {
    if (!isValidPassword(newPassword)) {
      throw Exception(
          'Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre');
    }

    try {
      final response = await _api.post('/users/me/password', data: {
        'current_password': currentPassword,
        'new_password': newPassword,
      });

      return response.statusCode == 200;
    } catch (e) {
      print('Error changing password: $e');
      return false;
    }
  }

  /// Uploader un avatar
  Future<String?> uploadAvatar(String imagePath) async {
    try {
      final file = File(imagePath);
      final response = await _api.uploadFile(
        '/users/me/avatar',
        file,
        fieldName: 'avatar',
      );

      if (response.statusCode == 200) {
        _api.invalidateCacheKey('/users/me');
        return response.data['data']['avatar_url'];
      }
      return null;
    } catch (e) {
      print('Error uploading avatar: $e');
      return null;
    }
  }
}

