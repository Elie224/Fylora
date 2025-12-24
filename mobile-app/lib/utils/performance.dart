/// Utilitaires pour optimiser les performances de l'application mobile
import 'dart:async';

/// Cache simple en mémoire avec TTL
class MemoryCache<K, V> {
  final Map<K, _CacheEntry<V>> _cache = {};
  final Duration defaultTTL;

  MemoryCache({this.defaultTTL = const Duration(hours: 1)});

  void set(K key, V value, {Duration? ttl}) {
    final expiresAt = DateTime.now().add(ttl ?? defaultTTL);
    _cache[key] = _CacheEntry(value, expiresAt);
  }

  V? get(K key) {
    final entry = _cache[key];
    if (entry == null) return null;

    if (DateTime.now().isAfter(entry.expiresAt)) {
      _cache.remove(key);
      return null;
    }

    return entry.value;
  }

  void remove(K key) {
    _cache.remove(key);
  }

  void clear() {
    _cache.clear();
  }

  int get length => _cache.length;
  
  Iterable<K> get keys => _cache.keys;
}

class _CacheEntry<V> {
  final V value;
  final DateTime expiresAt;

  _CacheEntry(this.value, this.expiresAt);
}

/// Debounce pour limiter la fréquence d'exécution
class Debouncer {
  final Duration delay;
  Timer? _timer;

  Debouncer({this.delay = const Duration(milliseconds: 300)});

  void call(void Function() callback) {
    _timer?.cancel();
    _timer = Timer(delay, callback);
  }

  void dispose() {
    _timer?.cancel();
  }
}

/// Throttle pour limiter la fréquence d'exécution
class Throttler {
  final Duration limit;
  DateTime? _lastRun;

  Throttler({this.limit = const Duration(milliseconds: 300)});

  bool canRun() {
    final now = DateTime.now();
    if (_lastRun == null || now.difference(_lastRun!) >= limit) {
      _lastRun = now;
      return true;
    }
    return false;
  }
}

/// Mesurer les performances d'une fonction
Future<T> measurePerformance<T>(
  Future<T> Function() function,
  String label,
) async {
  final stopwatch = Stopwatch()..start();
  try {
    final result = await function();
    stopwatch.stop();
    print('[Performance] $label: ${stopwatch.elapsedMilliseconds}ms');
    return result;
  } catch (e) {
    stopwatch.stop();
    print('[Performance] $label failed after ${stopwatch.elapsedMilliseconds}ms: $e');
    rethrow;
  }
}

/// Batch processing pour les opérations en masse
Future<List<T>> batchProcess<T>(
  List<dynamic> items,
  int batchSize,
  Future<T> Function(dynamic) processor,
) async {
  final results = <T>[];
  for (var i = 0; i < items.length; i += batchSize) {
    final batch = items.sublist(
      i,
      i + batchSize > items.length ? items.length : i + batchSize,
    );
    final batchResults = await Future.wait(batch.map(processor));
    results.addAll(batchResults);
  }
  return results;
}




