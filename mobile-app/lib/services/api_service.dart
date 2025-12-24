/// Service API optimisé avec caching et retry logic
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../utils/performance.dart';
import '../utils/security.dart' show isValidEmail, isValidPassword;
import 'secure_storage.dart' show SecureStorage;
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
      baseUrl: Constants.apiUrl, // Utiliser apiUrl qui inclut /api
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
            final opts = error.requestOptions;
            final token = await SecureStorage.getSecure('access_token');
            opts.headers['Authorization'] = 'Bearer $token';
            final response = await _dio.fetch(opts);
            return handler.resolve(response);
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
        '/auth/refresh',
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

  // ============================================
  // Méthodes spécifiques pour les fichiers
  // ============================================

  /// Lister les fichiers et dossiers
  Future<Response> listFiles({String? folderId, int? skip, int? limit}) async {
    final queryParams = <String, dynamic>{};
    if (folderId != null) queryParams['folder'] = folderId;
    if (skip != null) queryParams['skip'] = skip;
    if (limit != null) queryParams['limit'] = limit;
    return await get('/api/files', queryParameters: queryParams.isEmpty ? null : queryParams);
  }

  /// Obtenir un dossier
  Future<Response> getFolder(String folderId) async {
    return await get('/api/folders/$folderId');
  }

  /// Obtenir tous les dossiers
  Future<Response> getAllFolders() async {
    return await get('/api/folders');
  }

  /// Télécharger un fichier
  Future<Response> downloadFile(String fileId) async {
    return await _dio.get(
      '/api/files/$fileId/download',
      options: Options(responseType: ResponseType.bytes),
    );
  }

  /// Prévisualiser un fichier
  Future<Response> previewFile(String fileId) async {
    return await get('/api/files/$fileId/preview');
  }

  /// Supprimer un fichier
  Future<Response> deleteFile(String fileId) async {
    return await delete('/api/files/$fileId');
  }

  /// Supprimer un dossier
  Future<Response> deleteFolder(String folderId) async {
    return await delete('/api/folders/$folderId');
  }

  /// Renommer un fichier
  Future<Response> renameFile(String fileId, String newName) async {
    return await patch('/api/files/$fileId', data: {'name': newName});
  }

  /// Renommer un dossier
  Future<Response> renameFolder(String folderId, String newName) async {
    return await patch('/api/folders/$folderId', data: {'name': newName});
  }

  /// Créer un dossier
  Future<Response> createFolder(String name, {String? parentId}) async {
    return await post('/api/folders', data: {
      'name': name,
      if (parentId != null) 'parent_id': parentId,
    });
  }

  /// Déplacer un fichier
  Future<Response> moveFile(String fileId, String? folderId) async {
    return await patch('/api/files/$fileId', data: {
      'folder_id': folderId,
    });
  }

  /// Déplacer un dossier
  Future<Response> moveFolder(String folderId, String? parentId) async {
    return await patch('/api/folders/$folderId', data: {
      'parent_id': parentId,
    });
  }

  /// Télécharger un dossier (ZIP)
  Future<Response> downloadFolder(String folderId) async {
    return await _dio.get(
      '/api/folders/$folderId/download',
      options: Options(responseType: ResponseType.bytes),
    );
  }

  // ============================================
  // Méthodes pour le dashboard
  // ============================================

  /// Obtenir les statistiques du dashboard
  Future<Response> getDashboard() async {
    return await get('/api/dashboard', useCache: true);
  }

  // ============================================
  // Méthodes pour la recherche
  // ============================================

  /// Rechercher des fichiers
  Future<Response> search({
    required String query,
    String? type,
    String? mimeType,
    String? dateFrom,
    String? dateTo,
  }) async {
    final queryParams = <String, dynamic>{'q': query};
    if (type != null) queryParams['type'] = type;
    if (mimeType != null) queryParams['mime_type'] = mimeType;
    if (dateFrom != null) queryParams['date_from'] = dateFrom;
    if (dateTo != null) queryParams['date_to'] = dateTo;
    return await get('/api/search', queryParameters: queryParams);
  }

  // ============================================
  // Méthodes pour les utilisateurs
  // ============================================

  /// Mettre à jour le profil utilisateur
  Future<Response> updateProfile({
    String? email,
    String? displayName,
  }) async {
    final data = <String, dynamic>{};
    if (email != null) data['email'] = email;
    if (displayName != null) data['display_name'] = displayName;
    return await patch('/api/users/me', data: data);
  }

  /// Changer le mot de passe
  Future<Response> changePassword(String currentPassword, String newPassword) async {
    return await post('/api/users/me/change-password', data: {
      'current_password': currentPassword,
      'new_password': newPassword,
    });
  }

  /// Uploader un avatar
  Future<Response> uploadAvatar(File file) async {
    return await uploadFile('/api/users/me/avatar', file, fieldName: 'avatar');
  }

  /// Lister les utilisateurs (pour le partage)
  Future<Response> listUsers(String query) async {
    return await get('/api/users', queryParameters: {'search': query});
  }

  // ============================================
  // Méthodes pour le partage
  // ============================================

  /// Créer un partage interne
  Future<Response> createInternalShare({
    required String resourceId,
    required String resourceType,
    required List<String> userIds,
    String? permission,
  }) async {
    return await post('/api/shares', data: {
      'resource_id': resourceId,
      'resource_type': resourceType,
      'user_ids': userIds,
      if (permission != null) 'permission': permission,
    });
  }

  /// Créer un partage public
  Future<Response> createPublicShare({
    required String resourceId,
    required String resourceType,
    String? password,
    DateTime? expiresAt,
  }) async {
    return await post('/api/shares/public', data: {
      'resource_id': resourceId,
      'resource_type': resourceType,
      if (password != null) 'password': password,
      if (expiresAt != null) 'expires_at': expiresAt.toIso8601String(),
    });
  }

  /// Obtenir un partage public
  Future<Response> getPublicShare(String shareId, {String? password}) async {
    final queryParams = password != null ? {'password': password} : null;
    return await get('/api/shares/public/$shareId', queryParameters: queryParams);
  }

  // ============================================
  // Méthodes pour la corbeille
  // ============================================

  /// Lister les fichiers de la corbeille
  Future<Response> listTrashFiles() async {
    return await get('/api/trash/files');
  }

  /// Lister les dossiers de la corbeille
  Future<Response> listTrashFolders() async {
    return await get('/api/trash/folders');
  }

  /// Restaurer un fichier
  Future<Response> restoreFile(String fileId) async {
    return await post('/api/trash/files/$fileId/restore');
  }

  /// Restaurer un dossier
  Future<Response> restoreFolder(String folderId) async {
    return await post('/api/trash/folders/$folderId/restore');
  }
}
