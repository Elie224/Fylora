/// Retry intelligent avec backoff exponentiel et jitter
/// Pour requêtes réseau robustes
import 'dart:async';
import 'dart:math';
import 'package:dio/dio.dart';

class SmartRetry {
  final int maxRetries;
  final Duration baseDelay;
  final Duration maxDelay;
  final List<int> retryableStatuses;

  SmartRetry({
    this.maxRetries = 3,
    this.baseDelay = const Duration(seconds: 1),
    this.maxDelay = const Duration(seconds: 10),
    this.retryableStatuses = const [408, 429, 500, 502, 503, 504],
  });

  /// Exécuter une fonction avec retry intelligent
  Future<T> execute<T>(
    Future<T> Function() fn, {
    int attempt = 1,
  }) async {
    try {
      return await fn();
    } catch (error) {
      final shouldRetry = _shouldRetry(error, attempt);

      if (!shouldRetry) {
        rethrow;
      }

      final delay = _calculateDelay(attempt);
      await Future.delayed(delay);

      return execute(fn, attempt: attempt + 1);
    }
  }

  /// Déterminer si on doit réessayer
  bool _shouldRetry(dynamic error, int attempt) {
    if (attempt >= maxRetries) {
      return false;
    }

    // Erreur réseau
    if (error is TimeoutException || error.toString().contains('timeout')) {
      return true;
    }

    // Status HTTP retryable (si erreur HTTP)
    // Note: Adapter selon votre gestion d'erreurs HTTP
    final errorString = error.toString().toLowerCase();
    for (final status in retryableStatuses) {
      if (errorString.contains(status.toString())) {
        return true;
      }
    }

    return false;
  }

  /// Calculer le délai avec backoff exponentiel et jitter
  Duration _calculateDelay(int attempt) {
    final exponentialDelay = Duration(
      milliseconds: min(
        baseDelay.inMilliseconds * pow(2, attempt - 1).toInt(),
        maxDelay.inMilliseconds,
      ),
    );

    // Ajouter jitter pour éviter le thundering herd
    final random = Random();
    final jitter = Duration(
      milliseconds: (random.nextDouble() * 0.3 * exponentialDelay.inMilliseconds).toInt(),
    );

    return exponentialDelay + jitter;
  }
}

/// Wrapper pour Dio avec retry intelligent
class RetryInterceptor {
  final SmartRetry retry;

  RetryInterceptor({
    SmartRetry? retry,
  }) : retry = retry ?? SmartRetry();

  Future<T> intercept<T>(Future<T> Function() request) async {
    return await retry.execute(request);
  }
}

