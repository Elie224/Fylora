/// Gestionnaire de timeouts maîtrisés
/// Timeouts adaptatifs selon le type d'opération
import 'dart:async';

class TimeoutException implements Exception {
  final String message;
  final Duration timeout;

  TimeoutException(this.message, this.timeout);

  @override
  String toString() => message;
}

class TimeoutManager {
  static final TimeoutManager _instance = TimeoutManager._internal();
  factory TimeoutManager() => _instance;
  TimeoutManager._internal();

  final Map<String, Duration> _timeouts = {
    'database': const Duration(seconds: 10),
    'cache': const Duration(seconds: 2),
    'externalAPI': const Duration(seconds: 5),
    'fileUpload': const Duration(minutes: 5),
    'fileDownload': const Duration(minutes: 1),
    'default': const Duration(seconds: 30),
  };

  /// Créer un timeout avec Future
  Future<T> createTimeout<T>(
    Future<T> Function() promise,
    String type, {
    Duration? customTimeout,
  }) async {
    final timeout = customTimeout ?? _timeouts[type] ?? _timeouts['default']!;

    return await promise().timeout(
      timeout,
      onTimeout: () {
        throw TimeoutException('Operation timed out after ${timeout.inSeconds}s', timeout);
      },
    );
  }

  /// Wrapper pour opérations avec timeout
  Future<T> withTimeout<T>(
    Future<T> Function() fn,
    String type, {
    Duration? customTimeout,
  }) async {
    return await createTimeout(fn, type, customTimeout: customTimeout);
  }

  /// Timeout adaptatif selon la charge
  Duration getAdaptiveTimeout(String baseType, {double loadFactor = 1.0}) {
    final baseTimeout = _timeouts[baseType] ?? _timeouts['default']!;

    // Augmenter le timeout si charge élevée
    if (loadFactor > 1.5) {
      return Duration(
        milliseconds: (baseTimeout.inMilliseconds * 1.5).toInt(),
      );
    }

    return baseTimeout;
  }
}

