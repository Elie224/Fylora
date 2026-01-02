/// Service API optimisé avec caching et retry logic
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:file_picker/file_picker.dart';
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
        
        // Pour les requêtes FormData (upload), laisser Dio gérer le Content-Type avec boundary
        // Ne pas définir Content-Type manuellement pour multipart/form-data
        if (options.data is FormData) {
          // Supprimer Content-Type pour laisser Dio l'ajouter avec la boundary appropriée
          options.headers.remove('Content-Type');
        }
        
        return handler.next(options);
      },
      onError: (error, handler) async {
        // Gérer les erreurs 401 avec refresh token
        if (error.response?.statusCode == 401) {
          // Ne pas rafraîchir pour les routes d'authentification
          final path = error.requestOptions.path;
          if (path.contains('/auth/login') || 
              path.contains('/auth/signup') || 
              path.contains('/auth/google/verify')) {
            return handler.next(error);
          }
          
          final refreshed = await _refreshToken();
          if (refreshed) {
            // Réessayer la requête avec retry intelligent
            final opts = error.requestOptions;
            final token = await SecureStorage.getSecure('access_token');
            if (token != null) {
            opts.headers['Authorization'] = 'Bearer $token';
              try {
            final response = await _dio.fetch(opts);
            return handler.resolve(response);
              } catch (e) {
                // Si la retry échoue, continuer avec l'erreur originale
                return handler.next(error);
              }
            }
          } else {
            // Si le refresh échoue, nettoyer les tokens et laisser l'erreur passer
            // L'application redirigera vers login
            await SecureStorage.deleteAll();
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
      if (refreshToken == null) {
        return false;
      }

      // Créer une nouvelle instance Dio sans intercepteurs pour éviter les boucles
      final refreshDio = Dio(BaseOptions(
        baseUrl: Constants.apiUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
        },
      ));

      final response = await refreshDio.post(
        '/auth/refresh',
        data: {'refresh_token': refreshToken},
      );

      if (response.statusCode == 200) {
        final data = response.data['data'];
        if (data != null && data['access_token'] != null) {
        await SecureStorage.setSecure('access_token', data['access_token']);
          if (data['refresh_token'] != null) {
        await SecureStorage.setSecure('refresh_token', data['refresh_token']);
          }
        return true;
        }
      }
      return false;
    } catch (e) {
      // En cas d'erreur, nettoyer les tokens
      await SecureStorage.deleteAll();
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

  /// Upload de fichier avec progression, retry et timeout (mobile uniquement)
  Future<Response> uploadFile(
    String path,
    File file, {
    String fieldName = 'file',
    Function(int, int)? onProgress,
  }) async {
    if (kIsWeb) {
      throw UnsupportedError('uploadFile(File) ne fonctionne pas sur le web. Utilisez uploadFileFromPlatform.');
    }
    
    // Utiliser le dernier élément du chemin (fonctionne avec / et \)
    final fileName = file.path.split('/').last.split('\\').last;
    final formData = FormData.fromMap({
      fieldName: await MultipartFile.fromFile(
        file.path,
        filename: fileName,
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
  
  /// Upload de fichier avec PlatformFile (support web et mobile)
  Future<Response> uploadFileFromPlatform(
    String path,
    PlatformFile platformFile, {
    String fieldName = 'file',
    String? folderId,
    Function(int, int)? onProgress,
  }) async {
    print('🔵 [ApiService] Upload: path=$path, filename=${platformFile.name}, folderId=$folderId, size=${kIsWeb ? platformFile.bytes?.length : 'N/A'}');

    return await _timeoutManager.withTimeout(
      () => _retry.execute(() async {
        try {
          // Créer un nouveau MultipartFile à chaque tentative pour éviter l'erreur "MultipartFile already finalized"
          MultipartFile multipartFile;
          
          if (kIsWeb) {
            // Sur le web, utiliser bytes
            if (platformFile.bytes == null) {
              throw ArgumentError('PlatformFile.bytes est null. Impossible d\'uploader le fichier.');
            }
            multipartFile = MultipartFile.fromBytes(
              platformFile.bytes!,
              filename: platformFile.name,
            );
          } else {
            // Sur mobile, utiliser le chemin du fichier
            if (platformFile.path == null) {
              throw ArgumentError('PlatformFile.path est null. Impossible d\'uploader le fichier.');
            }
            multipartFile = await MultipartFile.fromFile(
              platformFile.path!,
              filename: platformFile.name,
            );
          }
          
          // Créer un nouveau FormData à chaque tentative pour éviter l'erreur "FormData already finalized"
          final formData = FormData.fromMap({
            fieldName: multipartFile,
            if (folderId != null) 'folder_id': folderId,
          });
          
          // Ne pas définir Content-Type - Dio le fait automatiquement avec FormData et ajoute la boundary
          // L'intercepteur supprimera le Content-Type par défaut pour FormData
          // Augmenter le receiveTimeout pour les uploads (5 minutes)
          final response = await _dio.post(
            path,
            data: formData,
            onSendProgress: onProgress,
            options: Options(
              receiveTimeout: const Duration(minutes: 5),
              sendTimeout: const Duration(minutes: 5),
            ),
          );
          print('✅ [ApiService] Upload réussi: statusCode=${response.statusCode}');
          return response;
        } catch (e) {
          print('❌ [ApiService] Erreur upload: $e');
          rethrow;
        }
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
    return await get('/files', queryParameters: queryParams.isEmpty ? null : queryParams);
  }

  /// Obtenir un dossier
  Future<Response> getFolder(String folderId) async {
    return await get('/folders/$folderId');
  }

  /// Obtenir tous les dossiers
  Future<Response> getAllFolders() async {
    return await get('/folders');
  }

  /// Télécharger un fichier
  Future<Response> downloadFile(String fileId) async {
    return await _dio.get(
      '/files/$fileId/download',
      options: Options(responseType: ResponseType.bytes),
    );
  }

  /// Prévisualiser un fichier
  Future<Response> previewFile(String fileId) async {
    return await get('/files/$fileId/preview');
  }

  /// Supprimer un fichier
  Future<Response> deleteFile(String fileId) async {
    return await delete('/files/$fileId');
  }

  /// Supprimer un dossier
  Future<Response> deleteFolder(String folderId) async {
    return await delete('/folders/$folderId');
  }

  /// Renommer un fichier
  Future<Response> renameFile(String fileId, String newName) async {
    return await patch('/files/$fileId', data: {'name': newName});
  }

  /// Renommer un dossier
  Future<Response> renameFolder(String folderId, String newName) async {
    return await patch('/folders/$folderId', data: {'name': newName});
  }

  /// Créer un dossier
  Future<Response> createFolder(String name, {String? parentId}) async {
    return await post('/folders', data: {
      'name': name,
      if (parentId != null) 'parent_id': parentId,
    });
  }

  /// Déplacer un fichier
  Future<Response> moveFile(String fileId, String? folderId) async {
    return await patch('/files/$fileId', data: {
      'folder_id': folderId,
    });
  }

  /// Déplacer un dossier
  Future<Response> moveFolder(String folderId, String? parentId) async {
    return await patch('/folders/$folderId', data: {
      'parent_id': parentId,
    });
  }

  /// Télécharger un dossier (ZIP)
  Future<Response> downloadFolder(String folderId) async {
    return await _dio.get(
      '/folders/$folderId/download',
      options: Options(responseType: ResponseType.bytes),
    );
  }

  // ============================================
  // Méthodes pour le dashboard
  // ============================================

  /// Obtenir les statistiques du dashboard
  Future<Response> getDashboard() async {
    return await get('/dashboard', useCache: true);
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
    return await get('/search', queryParameters: queryParams);
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
    return await patch('/users/me', data: data);
  }

  /// Changer le mot de passe
  Future<Response> changePassword(String currentPassword, String newPassword) async {
    return await post('/users/me/change-password', data: {
      'current_password': currentPassword,
      'new_password': newPassword,
    });
  }

  /// Uploader un avatar
  Future<Response> uploadAvatar(File file) async {
    return await uploadFile('/users/me/avatar', file, fieldName: 'avatar');
  }

  /// Lister les utilisateurs (pour le partage)
  Future<Response> listUsers(String query) async {
    return await get('/users', queryParameters: {'search': query});
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
    return await post('/shares', data: {
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
    return await post('/shares/public', data: {
      'resource_id': resourceId,
      'resource_type': resourceType,
      if (password != null) 'password': password,
      if (expiresAt != null) 'expires_at': expiresAt.toIso8601String(),
    });
  }

  /// Obtenir un partage public
  Future<Response> getPublicShare(String shareId, {String? password}) async {
    final queryParams = password != null ? {'password': password} : null;
    return await get('/shares/public/$shareId', queryParameters: queryParams);
  }

  // ============================================
  // Méthodes pour la corbeille
  // ============================================

  /// Lister les fichiers de la corbeille
  Future<Response> listTrashFiles() async {
    return await get('/files/trash');
  }

  /// Lister les dossiers de la corbeille
  Future<Response> listTrashFolders() async {
    return await get('/folders/trash');
  }

  /// Restaurer un fichier
  Future<Response> restoreFile(String fileId) async {
    return await post('/files/$fileId/restore');
  }

  /// Restaurer un dossier
  Future<Response> restoreFolder(String folderId) async {
    return await post('/folders/$folderId/restore');
  }

  /// Supprimer définitivement un fichier
  Future<Response> permanentlyDeleteFile(String fileId) async {
    return await delete('/files/$fileId/permanent');
  }

  /// Supprimer définitivement un dossier
  Future<Response> permanentlyDeleteFolder(String folderId) async {
    return await delete('/folders/$folderId/permanent');
  }
}
