/// Offline-first léger pour mobile
/// Cache les données localement et synchronise quand online
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';

class OfflineFirst {
  static final OfflineFirst _instance = OfflineFirst._internal();
  factory OfflineFirst() => _instance;
  OfflineFirst._internal() {
    // Initialiser de manière asynchrone sans bloquer
    _init().catchError((e) {
      // Ignorer les erreurs d'initialisation
    });
  }

  final Map<String, CacheEntry> _cache = {};
  final List<SyncItem> _syncQueue = [];
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  bool _isOnline = true;

  Future<void> _init() async {
    // Vérifier l'état de connexion initial
    final connectivity = Connectivity();
    final result = await connectivity.checkConnectivity();
    _isOnline = result != ConnectivityResult.none;

    // Écouter les changements de connexion
    _connectivitySubscription = connectivity.onConnectivityChanged.listen((result) {
      _isOnline = result != ConnectivityResult.none;
      if (_isOnline) {
        _sync();
      }
    });

    // Charger le cache depuis le storage
    await _loadCache();
  }

  /// Obtenir des données (cache d'abord, puis API)
  Future<T?> get<T>(
    String key,
    Future<T> Function() fetchFn, {
    Duration cacheTTL = const Duration(minutes: 5),
  }) async {
    // Vérifier le cache d'abord
    final cached = _cache[key];
    if (cached != null && !cached.isExpired) {
      return cached.data as T?;
    }

    // Si online, récupérer depuis API
    if (_isOnline) {
      try {
        final data = await fetchFn();
        _cache[key] = CacheEntry(
          data: data,
          timestamp: DateTime.now(),
          ttl: cacheTTL,
        );
        await _saveCacheEntry(key, _cache[key]!);
        return data;
      } catch (e) {
        // En cas d'erreur, retourner le cache si disponible
        if (cached != null) {
          return cached.data as T?;
        }
        rethrow;
      }
    }

    // Si offline, retourner le cache
    if (cached != null) {
      return cached.data as T?;
    }

    throw Exception('No cached data available and offline');
  }

  /// Mettre à jour avec queue de synchronisation
  Future<void> update<T>(
    String key,
    Future<T> Function(T) updateFn,
    T data,
  ) async {
    // Mettre à jour le cache immédiatement
    _cache[key] = CacheEntry(
      data: data,
      timestamp: DateTime.now(),
      ttl: const Duration(hours: 24), // Cache long pour données modifiées
    );
    await _saveCacheEntry(key, _cache[key]!);

    // Si online, synchroniser immédiatement
    if (_isOnline) {
      try {
        await updateFn(data);
      } catch (e) {
        // En cas d'erreur, ajouter à la queue
        _syncQueue.add(SyncItem(key: key, updateFn: (dynamic d) => updateFn(d as T), data: data));
        await _saveSyncQueue();
        rethrow;
      }
    } else {
      // Si offline, ajouter à la queue
      _syncQueue.add(SyncItem(key: key, updateFn: (dynamic d) => updateFn(d as T), data: data));
      await _saveSyncQueue();
    }
  }

  /// Synchroniser la queue
  Future<void> _sync() async {
    if (!_isOnline || _syncQueue.isEmpty) {
      return;
    }

    final queue = List<SyncItem>.from(_syncQueue);
    _syncQueue.clear();
    await _saveSyncQueue();

    for (final item in queue) {
      try {
        await item.updateFn(item.data);
      } catch (e) {
        // En cas d'erreur, remettre dans la queue
        _syncQueue.add(item);
      }
    }

    await _saveSyncQueue();
  }

  /// Charger le cache depuis le storage
  Future<void> _loadCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheKeys = prefs.getKeys().where((k) => k.startsWith('offline_cache_'));
      
      for (final key in cacheKeys) {
        final stored = prefs.getString(key);
        if (stored != null) {
          final data = jsonDecode(stored);
          final entry = CacheEntry(
            data: data['data'],
            timestamp: DateTime.fromMillisecondsSinceEpoch(data['timestamp']),
            ttl: Duration(milliseconds: data['ttl']),
          );
          
          if (!entry.isExpired) {
            _cache[key.replaceFirst('offline_cache_', '')] = entry;
          } else {
            await prefs.remove(key);
          }
        }
      }

      // Charger la queue de synchronisation
      final queueData = prefs.getString('sync_queue');
      if (queueData != null) {
        // TODO: Désérialiser la queue (simplifié pour l'exemple)
      }
    } catch (e) {
      // Ignorer erreurs
    }
  }

  /// Sauvegarder une entrée de cache
  Future<void> _saveCacheEntry(String key, CacheEntry entry) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = jsonEncode({
        'data': entry.data,
        'timestamp': entry.timestamp.millisecondsSinceEpoch,
        'ttl': entry.ttl.inMilliseconds,
      });
      await prefs.setString('offline_cache_$key', data);
    } catch (e) {
      // Ignorer erreurs
    }
  }

  /// Sauvegarder la queue de synchronisation
  Future<void> _saveSyncQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      // TODO: Sérialiser la queue (simplifié pour l'exemple)
      await prefs.setString('sync_queue', jsonEncode(_syncQueue.length));
    } catch (e) {
      // Ignorer erreurs
    }
  }

  /// Vider le cache
  Future<void> clear() async {
    _cache.clear();
    try {
      final prefs = await SharedPreferences.getInstance();
      final cacheKeys = prefs.getKeys().where((k) => k.startsWith('offline_cache_'));
      for (final key in cacheKeys) {
        await prefs.remove(key);
      }
    } catch (e) {
      // Ignorer erreurs
    }
  }

  void dispose() {
    _connectivitySubscription?.cancel();
  }
}

class CacheEntry {
  final dynamic data;
  final DateTime timestamp;
  final Duration ttl;

  CacheEntry({
    required this.data,
    required this.timestamp,
    required this.ttl,
  });

  bool get isExpired {
    return DateTime.now().difference(timestamp) > ttl;
  }
}

class SyncItem {
  final String key;
  final Future Function(dynamic) updateFn;
  final dynamic data;

  SyncItem({
    required this.key,
    required this.updateFn,
    required this.data,
  });
}

