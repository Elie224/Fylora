/// Provider pour gérer l'authentification
import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';
import '../services/user_service.dart';
import '../services/secure_storage.dart';
import '../utils/view_preloader.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  final UserService _userService = UserService();

  Map<String, dynamic>? _user;
  bool _isLoading = false;
  bool _isAuthenticated = false;

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;

  AuthProvider() {
    _checkAuth();
  }

  /// Vérifier l'authentification au démarrage
  Future<void> _checkAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final authenticated = await _authService.isAuthenticated();
      if (authenticated) {
        final userData = await _userService.getCurrentUser();
        if (userData != null) {
          _user = userData;
          _isAuthenticated = true;
          
          // Précharger les vues clés si déjà connecté
          final userId = userData['id']?.toString() ?? userData['_id']?.toString();
          if (userId != null) {
            ViewPreloader().preloadKeyViews(userId);
          }
        } else {
          await logout();
        }
      }
    } catch (e) {
      print('Error checking auth: $e');
      await logout();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Se connecter
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final userData = await _authService.login(email, password);
      if (userData != null) {
        _user = userData;
        _isAuthenticated = true;
        _isLoading = false;
        notifyListeners();
        
        // Précharger les vues clés après connexion
        final userId = userData['id']?.toString() ?? userData['_id']?.toString();
        if (userId != null) {
          ViewPreloader().preloadKeyViews(userId);
        }
        
        return true;
      }
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  /// S'inscrire
  Future<bool> signup(
    String email,
    String password,
    String confirmPassword,
  ) async {
    _isLoading = true;
    notifyListeners();

    try {
      final userData = await _authService.signup(email, password, confirmPassword);
      if (userData != null) {
        _user = userData;
        _isAuthenticated = true;
        _isLoading = false;
        notifyListeners();
        
        // Précharger les vues clés après inscription
        final userId = userData['id']?.toString() ?? userData['_id']?.toString();
        if (userId != null) {
          ViewPreloader().preloadKeyViews(userId);
        }
        
        return true;
      }
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  /// Se déconnecter
  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _isAuthenticated = false;
    notifyListeners();
  }

  /// Rafraîchir les données utilisateur
  Future<void> refreshUser() async {
    try {
      final userData = await _userService.getCurrentUser();
      if (userData != null) {
        _user = userData;
        notifyListeners();
      }
    } catch (e) {
      print('Error refreshing user: $e');
    }
  }
}
