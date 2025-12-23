/// Monitoring de performance mobile
/// Mesure First Load, Navigation, Time to Interactive
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class PerformanceMonitor {
  static final PerformanceMonitor _instance = PerformanceMonitor._internal();
  factory PerformanceMonitor() => _instance;
  PerformanceMonitor._internal();

  DateTime? _appStartTime;
  DateTime? _firstFrameTime;
  final Map<String, DateTime> _navigationStarts = {};
  final List<PerformanceMetric> _metrics = [];

  /// Initialiser le monitoring
  void init() {
    _appStartTime = DateTime.now();
  }

  /// Marquer le premier frame rendu
  void markFirstFrame() {
    _firstFrameTime = DateTime.now();
    if (_appStartTime != null) {
      final firstLoad = _firstFrameTime!.difference(_appStartTime!);
      _recordMetric('firstLoad', firstLoad.inMilliseconds);
    }
  }

  /// Démarrer le tracking d'une navigation
  void startNavigation(String routeName) {
    _navigationStarts[routeName] = DateTime.now();
  }

  /// Terminer le tracking d'une navigation
  void endNavigation(String routeName) {
    final startTime = _navigationStarts[routeName];
    if (startTime != null) {
      final duration = DateTime.now().difference(startTime);
      _recordMetric('navigation', duration.inMilliseconds, metadata: {'route': routeName});
      _navigationStarts.remove(routeName);
    }
  }

  /// Mesurer Time to Interactive (approximation)
  void markTimeToInteractive() {
    if (_appStartTime != null) {
      final tti = DateTime.now().difference(_appStartTime!);
      _recordMetric('timeToInteractive', tti.inMilliseconds);
    }
  }

  /// Enregistrer une métrique
  void _recordMetric(String type, int value, {Map<String, dynamic>? metadata}) {
    final metric = PerformanceMetric(
      type: type,
      value: value,
      timestamp: DateTime.now(),
      metadata: metadata ?? {},
    );

    _metrics.add(metric);
    _saveMetric(metric);
    _sendToBackend(metric);
  }

  /// Sauvegarder une métrique localement
  Future<void> _saveMetric(PerformanceMetric metric) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final metrics = prefs.getStringList('performance_metrics') ?? [];
      metrics.add(jsonEncode({
        'type': metric.type,
        'value': metric.value,
        'timestamp': metric.timestamp.toIso8601String(),
        'metadata': metric.metadata,
      }));

      // Garder seulement les 50 dernières métriques
      if (metrics.length > 50) {
        metrics.removeRange(0, metrics.length - 50);
      }

      await prefs.setStringList('performance_metrics', metrics);
    } catch (e) {
      // Ignorer erreurs
    }
  }

  /// Envoyer au backend (async)
  Future<void> _sendToBackend(PerformanceMetric metric) async {
    try {
      // TODO: Implémenter l'envoi au backend
      // Utiliser ApiService pour envoyer les métriques
    } catch (e) {
      // Ignorer erreurs - les métriques restent en local
    }
  }

  /// Obtenir toutes les métriques
  Map<String, dynamic> getMetrics() {
    final firstLoad = _metrics
        .where((m) => m.type == 'firstLoad')
        .map((m) => m.value)
        .firstOrNull;

    final navigations = _metrics.where((m) => m.type == 'navigation').toList();
    final avgNavigation = navigations.isEmpty
        ? 0
        : navigations.map((m) => m.value).reduce((a, b) => a + b) / navigations.length;

    final ttiMetrics = _metrics.where((m) => m.type == 'timeToInteractive');
    final tti = ttiMetrics.isEmpty 
        ? null 
        : ttiMetrics.first.value;

    return {
      'firstLoad': firstLoad,
      'avgNavigation': avgNavigation.toInt(),
      'timeToInteractive': tti,
      'totalMetrics': _metrics.length,
    };
  }
}

class PerformanceMetric {
  final String type;
  final int value;
  final DateTime timestamp;
  final Map<String, dynamic> metadata;

  PerformanceMetric({
    required this.type,
    required this.value,
    required this.timestamp,
    required this.metadata,
  });
}

