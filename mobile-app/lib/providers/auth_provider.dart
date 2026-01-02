/// Provider pour gérer l'authentification
import 'package:flutter/foundation.dart';
import '../services/auth_service.dart';
import '../services/user_service.dart';
import '../services/api_service.dart';
import '../services/secure_storage.dart';
import '../utils/view_preloader.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  final UserService _userService = UserService();

  Map<String, dynamic>? _user;
  bool _isLoading = false;
  bool _isAuthenticated = false;
  String? _error;

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  String? get error => _error;

  AuthProvider() {
    // Démarrer la vérification d'authentification de manière asynchrone
    // pour ne pas bloquer le démarrage de l'application
    Future.microtask(() => _checkAuth());
  }

  /// Vérifier l'authentification au démarrage
  Future<void> _checkAuth() async {
    try {
      _isLoading = true;
      notifyListeners();

      final authenticated = await _authService.isAuthenticated();
      if (authenticated) {
        try {
          final userData = await _userService.getCurrentUser();
          if (userData != null) {
            _user = userData;
            _isAuthenticated = true;
            
          // Précharger les vues clés si déjà connecté (de manière asynchrone, ne pas bloquer)
          try {
            final userId = userData['id']?.toString() ?? userData['_id']?.toString();
            if (userId != null) {
              ViewPreloader().preloadKeyViews(userId).catchError((e) {
                // Ignorer les erreurs de préchargement
              });
            }
          } catch (e) {
            // Ignorer les erreurs de préchargement
          }
          } else {
            // Si pas de données utilisateur, déconnecter
            _isAuthenticated = false;
            _user = null;
          }
        } catch (e) {
          // En cas d'erreur, considérer comme non authentifié
          _isAuthenticated = false;
          _user = null;
        }
      } else {
        _isAuthenticated = false;
        _user = null;
      }
    } catch (e) {
      // En cas d'erreur, considérer comme non authentifié
      _isAuthenticated = false;
      _user = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Se connecter
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final userData = await _authService.login(email, password);
      if (userData != null) {
        _user = userData;
        _isAuthenticated = true;
        _isLoading = false;
        _error = null;
        notifyListeners();
        
        // Précharger les vues clés après connexion
        final userId = userData['id']?.toString() ?? userData['_id']?.toString();
        if (userId != null) {
          ViewPreloader().preloadKeyViews(userId).catchError((e) {
            // Ignorer les erreurs de préchargement
          });
        }
        
        return true;
      }
      _isLoading = false;
      _error = 'Identifiants incorrects';
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      // Extraire le message d'erreur proprement
      String errorMessage = 'Erreur lors de la connexion';
      if (e is Exception) {
        errorMessage = e.toString().replaceAll('Exception: ', '');
      } else {
        errorMessage = e.toString();
      }
      _error = errorMessage;
      notifyListeners();
      return false;
    }
  }

  /// S'inscrire
  Future<bool> signup(
    String email,
    String password,
    String confirmPassword,
  ) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final userData = await _authService.signup(email, password, confirmPassword);
      if (userData != null) {
        _user = userData;
        _isAuthenticated = true;
        _isLoading = false;
        _error = null;
        notifyListeners();
        
        // Précharger les vues clés après inscription
        final userId = userData['id']?.toString() ?? userData['_id']?.toString();
        if (userId != null) {
          ViewPreloader().preloadKeyViews(userId).catchError((e) {
            // Ignorer les erreurs de préchargement
          });
        }
        
        return true;
      }
      _isLoading = false;
      _error = 'Erreur lors de l\'inscription';
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      // Extraire le message d'erreur proprement
      String errorMessage = 'Erreur lors de l\'inscription';
      if (e is Exception) {
        errorMessage = e.toString().replaceAll('Exception: ', '');
      } else {
        errorMessage = e.toString();
      }
      _error = errorMessage;
      notifyListeners();
      return false;
    }
  }

  /// Se déconnecter
  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _isAuthenticated = false;
    notifyListeners();
  }

  /// Connexion OAuth
  Future<bool> oauthLogin(String provider, Map<String, dynamic> oauthData) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final apiService = ApiService();
      
      // Pour Google natif, envoyer les tokens au backend pour validation
      if (provider == 'google' && oauthData.containsKey('id_token')) {
        final response = await apiService.post('/auth/google/verify', data: {
          'id_token': oauthData['id_token'],
          'access_token': oauthData['access_token'],
        });
        
        if (response.statusCode == 200 || response.statusCode == 201) {
          final data = response.data['data'];
          if (data == null) {
            throw Exception('Réponse invalide du serveur');
          }
          
          final userData = data['user'];
          if (userData == null) {
            throw Exception('Données utilisateur manquantes');
          }
          
          // Sauvegarder les tokens
          if (data['access_token'] != null) {
            await SecureStorage.setSecure('access_token', data['access_token']);
          }
          if (data['refresh_token'] != null) {
            await SecureStorage.setSecure('refresh_token', data['refresh_token']);
          }
          
          _user = userData;
          _isAuthenticated = true;
          _isLoading = false;
          _error = null;
          notifyListeners();
          
          // Précharger les vues clés après connexion
          final userId = userData['id']?.toString() ?? userData['_id']?.toString();
          if (userId != null) {
            ViewPreloader().preloadKeyViews(userId).catchError((e) {
              // Ignorer les erreurs de préchargement
            });
          }
          
          return true;
        } else if (response.statusCode == 401) {
          throw Exception('Token Google invalide');
        } else if (response.statusCode == 400) {
          final errorMsg = response.data['error']?['message'] ?? 'Données invalides';
          throw Exception(errorMsg);
        } else {
          final errorMsg = response.data['error']?['message'] ?? 'Erreur lors de la connexion Google';
          throw Exception(errorMsg);
        }
      }
      
      // Seul Google OAuth est supporté
      _isLoading = false;
      _error = 'Seule la connexion Google est disponible';
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      // Extraire le message d'erreur proprement
      String errorMessage = 'Erreur lors de la connexion Google';
      if (e is Exception) {
        errorMessage = e.toString().replaceAll('Exception: ', '').replaceAll('Error: ', '');
      } else {
        errorMessage = e.toString();
      }
      
      // Gérer les erreurs réseau
      if (errorMessage.contains('timeout') || errorMessage.contains('SocketException')) {
        errorMessage = 'Erreur de connexion réseau. Vérifiez votre connexion internet.';
      }
      
      _error = errorMessage;
      notifyListeners();
      return false;
    }
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
