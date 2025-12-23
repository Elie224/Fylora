/// Cache intelligent multi-niveaux pour mobile
/// L1: Mémoire (rapide), L2: Local storage (persistant)
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'performance.dart';

class AdvancedCache {
  static final AdvancedCache _instance = AdvancedCache._internal();
  factory AdvancedCache() => _instance;
  AdvancedCache._internal();

  // Cache mémoire (L1)
  final MemoryCache<String, dynamic> _memoryCache = MemoryCache(
    defaultTTL: const Duration(minutes: 5),
  );

  // Statistiques
  int _memoryHits = 0;
  int _storageHits = 0;
  int _misses = 0;
  int _sets = 0;

  /// Obtenir avec cache multi-niveaux
  Future<dynamic> get(String key, {Duration? memoryTTL}) async {
    // Niveau 1: Mémoire
    final memoryValue = _memoryCache.get(key);
    if (memoryValue != null) {
      _memoryHits++;
      return memoryValue;
    }

    // Niveau 2: Local storage
    try {
      final prefs = await SharedPreferences.getInstance();
      final stored = prefs.getString('cache_$key');
      if (stored != null) {
        final data = jsonDecode(stored);
        final timestamp = data['timestamp'] as int;
        final ttl = data['ttl'] as int;
        
        // Vérifier expiration
        if (DateTime.now().millisecondsSinceEpoch - timestamp < ttl) {
          _storageHits++;
          final value = data['value'];
          
          // Mettre en cache mémoire pour prochaine fois
          _memoryCache.set(key, value, ttl: memoryTTL ?? const Duration(minutes: 5));
          
          return value;
        } else {
          // Expiré, supprimer
          await prefs.remove('cache_$key');
        }
      }
    } catch (e) {
      // Erreur storage - continuer sans cache
    }

    _misses++;
    return null;
  }

  /// Mettre en cache avec stratégie intelligente
  Future<void> set(
    String key,
    dynamic value, {
    Duration? ttl,
    Duration? memoryTTL,
    CachePriority priority = CachePriority.normal,
  }) async {
    final cacheTTL = ttl ?? const Duration(hours: 1);
    final memTTL = memoryTTL ?? const Duration(minutes: 5);

    // Toujours mettre en mémoire (accès rapide)
    _memoryCache.set(key, value, ttl: memTTL);

    // Mettre en local storage selon priorité
    if (priority != CachePriority.low) {
      try {
        final prefs = await SharedPreferences.getInstance();
        final data = jsonEncode({
          'value': value,
          'timestamp': DateTime.now().millisecondsSinceEpoch,
          'ttl': cacheTTL.inMilliseconds,
        });
        await prefs.setString('cache_$key', data);
        _sets++;
      } catch (e) {
        // Erreur storage - continuer avec mémoire seulement
      }
    }
  }

  /// Invalider intelligemment
  Future<void> invalidate(String key, {bool pattern = false}) async {
    // Invalider mémoire
    if (pattern) {
      final keysToRemove = _memoryCache.keys.where((k) => k.contains(key)).toList();
      for (final k in keysToRemove) {
        _memoryCache.remove(k);
      }
    } else {
      _memoryCache.remove(key);
    }

    // Invalider storage
    try {
      final prefs = await SharedPreferences.getInstance();
      if (pattern) {
        final allKeys = prefs.getKeys();
        for (final k in allKeys) {
          if (k.startsWith('cache_') && k.contains(key)) {
            await prefs.remove(k);
          }
        }
      } else {
        await prefs.remove('cache_$key');
      }
    } catch (e) {
      // Ignorer erreurs
    }
  }

  /// Précharger des données fréquentes
  Future<int> warmup(List<String> keys, Future<dynamic> Function(String) loaderFn) async {
    int loaded = 0;
    for (final key in keys) {
      try {
        final value = await loaderFn(key);
        if (value != null) {
          await set(key, value, priority: CachePriority.high);
          loaded++;
        }
      } catch (e) {
        // Ignorer erreurs individuelles
      }
    }
    return loaded;
  }

  /// Obtenir les statistiques
  Map<String, dynamic> getStats() {
    final totalHits = _memoryHits + _storageHits;
    final totalRequests = totalHits + _misses;
    final hitRate = totalRequests > 0 ? totalHits / totalRequests : 0.0;

    return {
      'memoryHits': _memoryHits,
      'storageHits': _storageHits,
      'misses': _misses,
      'sets': _sets,
      'hitRate': hitRate,
      'memorySize': _memoryCache.keys.length,
    };
  }

  /// Nettoyer le cache expiré
  Future<void> cleanExpired() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final allKeys = prefs.getKeys().where((k) => k.startsWith('cache_'));
      final now = DateTime.now().millisecondsSinceEpoch;

      for (final key in allKeys) {
        try {
          final stored = prefs.getString(key);
          if (stored != null) {
            final data = jsonDecode(stored);
            final timestamp = data['timestamp'] as int;
            final ttl = data['ttl'] as int;

            if (now - timestamp > ttl) {
              await prefs.remove(key);
            }
          }
        } catch (e) {
          // Supprimer si erreur de parsing
          await prefs.remove(key);
        }
      }
    } catch (e) {
      // Ignorer erreurs
    }
  }
}

enum CachePriority {
  low,
  normal,
  high,
}

