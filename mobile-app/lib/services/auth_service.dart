/// Service d'authentification
import '../services/api_service.dart';
import '../utils/security.dart' show isValidEmail, isValidPassword;
import 'secure_storage.dart' show SecureStorage;

class AuthService {
  final ApiService _api = ApiService();

  /// Se connecter
  Future<Map<String, dynamic>?> login(String email, String password) async {
    if (!isValidEmail(email)) {
      throw Exception('Email invalide');
    }

    if (!isValidPassword(password)) {
      throw Exception('Mot de passe invalide');
    }

    try {
      final response = await _api.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200) {
        final data = response.data['data'];
        await SecureStorage.setSecure('access_token', data['access_token']);
        await SecureStorage.setSecure('refresh_token', data['refresh_token']);
        return data['user'];
      }
      return null;
    } catch (e) {
      print('Error logging in: $e');
      return null;
    }
  }

  /// S'inscrire
  Future<Map<String, dynamic>?> signup(
    String email,
    String password,
    String confirmPassword,
  ) async {
    if (!isValidEmail(email)) {
      throw Exception('Email invalide');
    }

    if (!isValidPassword(password)) {
      throw Exception('Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre');
    }

    if (password != confirmPassword) {
      throw Exception('Les mots de passe ne correspondent pas');
    }

    try {
      final response = await _api.post('/auth/signup', data: {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = response.data['data'];
        await SecureStorage.setSecure('access_token', data['access_token']);
        await SecureStorage.setSecure('refresh_token', data['refresh_token']);
        return data['user'];
      }
      return null;
    } catch (e) {
      print('Error signing up: $e');
      return null;
    }
  }

  /// Se déconnecter
  Future<bool> logout() async {
    try {
      await _api.post('/auth/logout');
      await SecureStorage.deleteAll();
      _api.invalidateCache();
      return true;
    } catch (e) {
      print('Error logging out: $e');
      // Nettoyer quand même le stockage local
      await SecureStorage.deleteAll();
      _api.invalidateCache();
      return false;
    }
  }

  /// Obtenir les informations de l'utilisateur
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

  /// Vérifier si l'utilisateur est connecté
  Future<bool> isAuthenticated() async {
    final token = await SecureStorage.getSecure('access_token');
    return token != null;
  }
}





