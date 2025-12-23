/// Service API optimisé avec caching et retry logic
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../utils/performance.dart';
import '../utils/security.dart';
import '../utils/constants.dart';
import '../utils/smart_retry.dart';
import '../utils/timeout_manager.dart';
import '../utils/advanced_cache.dart';

class ApiService {
  late Dio _dio;
  final AdvancedCache _cache = AdvancedCache();
  final SmartRetry _retry = SmartRetry();
  final TimeoutManager _timeoutManager = TimeoutManager();

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: Constants.apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Intercepteur pour ajouter le token
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await SecureStorage.getSecure('access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) async {
        // Gérer les erreurs 401 avec refresh token
        if (error.response?.statusCode == 401) {
          final refreshed = await _refreshToken();
          if (refreshed) {
            // Réessayer la requête avec retry intelligent
            return await _retry.execute(() async {
              final opts = error.requestOptions;
              final token = await SecureStorage.getSecure('access_token');
              opts.headers['Authorization'] = 'Bearer $token';
              return await _dio.fetch(opts);
            });
          }
        }
        return handler.next(error);
      },
    ));

    // Intercepteur de logging en développement
    if (kDebugMode) {
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
      ));
    }
  }

  /// Rafraîchir le token
  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await SecureStorage.getSecure('refresh_token');
      if (refreshToken == null) return false;

      final response = await _dio.post(
        '/api/auth/refresh',
        data: {'refresh_token': refreshToken},
      );

      if (response.statusCode == 200) {
        final data = response.data['data'];
        await SecureStorage.setSecure('access_token', data['access_token']);
        await SecureStorage.setSecure('refresh_token', data['refresh_token']);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  /// Requête GET avec cache multi-niveaux et retry
  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
    bool useCache = true,
    Duration? cacheTTL,
    String timeoutType = 'default',
  }) async {
    final cacheKey = '$path${queryParameters?.toString() ?? ''}';

    if (useCache) {
      final cached = await _cache.get(cacheKey);
      if (cached != null) {
        return Response(
          data: cached,
          statusCode: 200,
          requestOptions: RequestOptions(path: path),
        );
      }
    }

    try {
      final response = await _timeoutManager.withTimeout(
        () => _retry.execute(() async {
          return await _dio.get(
            path,
            queryParameters: queryParameters,
            options: Options(
              validateStatus: (status) => status! < 500,
            ),
          );
        }),
        timeoutType,
      );

      if (useCache && response.statusCode == 200) {
        await _cache.set(
          cacheKey,
          response.data,
          ttl: cacheTTL,
          priority: CachePriority.normal,
        );
      }

      return response;
    } catch (e) {
      rethrow;
    }
  }

  /// Requête POST avec retry et timeout
  Future<Response> post(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    String timeoutType = 'default',
  }) async {
    return await _timeoutManager.withTimeout(
      () => _retry.execute(() async {
        return await _dio.post(
          path,
          data: data,
          queryParameters: queryParameters,
        );
      }),
      timeoutType,
    );
  }

  /// Requête PATCH avec retry et timeout
  Future<Response> patch(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    String timeoutType = 'default',
  }) async {
    return await _timeoutManager.withTimeout(
      () => _retry.execute(() async {
        return await _dio.patch(
          path,
          data: data,
          queryParameters: queryParameters,
        );
      }),
      timeoutType,
    );
  }

  /// Requête PUT avec retry et timeout
  Future<Response> put(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    String timeoutType = 'default',
  }) async {
    return await _timeoutManager.withTimeout(
      () => _retry.execute(() async {
        return await _dio.put(
          path,
          data: data,
          queryParameters: queryParameters,
        );
      }),
      timeoutType,
    );
  }

  /// Requête DELETE avec retry et timeout
  Future<Response> delete(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    String timeoutType = 'default',
  }) async {
    return await _timeoutManager.withTimeout(
      () => _retry.execute(() async {
        return await _dio.delete(
          path,
          data: data,
          queryParameters: queryParameters,
        );
      }),
      timeoutType,
    );
  }

  /// Upload de fichier avec progression, retry et timeout
  Future<Response> uploadFile(
    String path,
    File file, {
    String fieldName = 'file',
    Function(int, int)? onProgress,
  }) async {
    final formData = FormData.fromMap({
      fieldName: await MultipartFile.fromFile(
        file.path,
        filename: file.path.split('/').last,
      ),
    });

    return await _timeoutManager.withTimeout(
      () => _retry.execute(() async {
        return await _dio.post(
          path,
          data: formData,
          onSendProgress: onProgress,
          options: Options(
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          ),
        );
      }),
      'fileUpload',
    );
  }

  /// Invalider le cache
  Future<void> invalidateCache() async {
    await _cache.invalidate('', pattern: true);
  }

  /// Invalider une clé spécifique du cache
  Future<void> invalidateCacheKey(String key) async {
    await _cache.invalidate(key);
  }
}
