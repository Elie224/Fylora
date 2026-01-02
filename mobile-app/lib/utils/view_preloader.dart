/// Préchargement intelligent des vues clés
/// Précharge les données probables avant navigation
import 'advanced_cache.dart';
import '../services/api_service.dart';
import 'dart:async';

class ViewPreloader {
  static final ViewPreloader _instance = ViewPreloader._internal();
  factory ViewPreloader() => _instance;
  ViewPreloader._internal();

  final Set<String> _preloadedViews = {};
  final AdvancedCache _cache = AdvancedCache();

  /// Précharger une vue
  Future<void> preloadView(String viewName, Future<dynamic> Function() preloadFn) async {
    if (_preloadedViews.contains(viewName)) {
      return;
    }

    try {
      await preloadFn();
      _preloadedViews.add(viewName);
    } catch (e) {
      // Ignorer erreurs silencieusement
    }
  }

  /// Précharger les vues probables après connexion
  Future<void> preloadKeyViews(String userId) async {
    final apiService = ApiService();

    // Précharger le dashboard (pas besoin de /api car baseUrl l'inclut déjà)
    await preloadView('dashboard', () async {
      final response = await apiService.get('/dashboard');
      await _cache.set('dashboard:$userId', response.data, priority: CachePriority.high);
      return response.data;
    });

    // Précharger les fichiers récents (pas besoin de /api car baseUrl l'inclut déjà)
    await preloadView('recentFiles', () async {
      final response = await apiService.get('/files', queryParameters: {'limit': 10});
      await _cache.set('recent:$userId', response.data, priority: CachePriority.high);
      return response.data;
    });
  }

  /// Précharger au hover d'un élément (pour web)
  void preloadOnHover(String viewName, Future<dynamic> Function() preloadFn) {
    // Pour mobile, on peut précharger au tap prolongé ou au scroll
    // Implémentation simplifiée
  }
}

