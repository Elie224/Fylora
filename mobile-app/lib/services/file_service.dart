/// Service pour gérer les fichiers
import 'dart:io';
import 'package:dio/dio.dart';
import '../models/file_model.dart';
import '../services/api_service.dart';
import '../utils/security.dart' show sanitizeFileName;
import '../utils/constants.dart';
import 'secure_storage.dart' show SecureStorage;

class FileService {
  final ApiService _api = ApiService();

  /// Lister les fichiers
  Future<List<FileModel>> listFiles({String? folderId}) async {
    try {
      final response = await _api.get(
        '/files',
        queryParameters: folderId != null ? {'folder_id': folderId} : null,
        useCache: true,
      );

      if (response.statusCode == 200) {
        final items = response.data['data']['items'] as List;
        return items.map((item) => FileModel.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      print('Error listing files: $e');
      return [];
    }
  }

  /// Uploader un fichier
  Future<FileModel?> uploadFile(
    File file, {
    String? folderId,
    Function(int sent, int total)? onProgress,
  }) async {
    try {
      final sanitizedName = sanitizeFileName(file.path.split('/').last);
      final response = await _api.uploadFile(
        '/files/upload',
        file,
        fieldName: 'file',
        onProgress: onProgress,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final fileData = response.data['data'];
        if (folderId != null && fileData != null) {
          // Déplacer le fichier dans le dossier si nécessaire
          await moveFile(fileData['id'], folderId);
        }
        return FileModel.fromJson(fileData);
      }
      return null;
    } catch (e) {
      print('Error uploading file: $e');
      return null;
    }
  }

  /// Télécharger un fichier
  Future<File?> downloadFile(String fileId, String savePath) async {
    try {
      final token = await SecureStorage.getSecure('access_token');
      final dio = Dio();
      
      await dio.download(
        '${Constants.apiBaseUrl}/api/files/$fileId/download',
        savePath,
        options: Options(
          headers: token != null ? {'Authorization': 'Bearer $token'} : {},
          responseType: ResponseType.bytes,
        ),
      );
      
      return File(savePath);
    } catch (e) {
      print('Error downloading file: $e');
      return null;
    }
  }

  /// Supprimer un fichier
  Future<bool> deleteFile(String fileId) async {
    try {
      final response = await _api.delete('/files/$fileId');
      _api.invalidateCacheKey('/files');
      return response.statusCode == 200;
    } catch (e) {
      print('Error deleting file: $e');
      return false;
    }
  }

  /// Supprimer définitivement un fichier
  Future<bool> permanentDeleteFile(String fileId) async {
    try {
      final response = await _api.delete('/files/$fileId/permanent');
      _api.invalidateCacheKey('/files');
      return response.statusCode == 200;
    } catch (e) {
      print('Error permanently deleting file: $e');
      return false;
    }
  }

  /// Restaurer un fichier
  Future<bool> restoreFile(String fileId) async {
    try {
      final response = await _api.post('/files/$fileId/restore');
      _api.invalidateCacheKey('/files');
      return response.statusCode == 200;
    } catch (e) {
      print('Error restoring file: $e');
      return false;
    }
  }

  /// Renommer un fichier
  Future<bool> renameFile(String fileId, String newName) async {
    try {
      final sanitizedName = sanitizeFileName(newName);
      final response = await _api.patch(
        '/files/$fileId',
        data: {'name': sanitizedName},
      );
      _api.invalidateCacheKey('/files');
      return response.statusCode == 200;
    } catch (e) {
      print('Error renaming file: $e');
      return false;
    }
  }

  /// Déplacer un fichier
  Future<bool> moveFile(String fileId, String folderId) async {
    try {
      final response = await _api.patch(
        '/files/$fileId',
        data: {'folder_id': folderId},
      );
      _api.invalidateCacheKey('/files');
      return response.statusCode == 200;
    } catch (e) {
      print('Error moving file: $e');
      return false;
    }
  }

  /// Partager un fichier
  Future<String?> shareFile(
    String fileId, {
    String? password,
    DateTime? expiresAt,
  }) async {
    try {
      final response = await _api.post('/share/public', data: {
        'file_id': fileId,
        if (password != null) 'password': password,
        if (expiresAt != null) 'expires_at': expiresAt.toIso8601String(),
      });

      if (response.statusCode == 200) {
        return response.data['data']['share_link'];
      }
      return null;
    } catch (e) {
      print('Error sharing file: $e');
      return null;
    }
  }

  /// Lister les fichiers de la corbeille
  Future<List<FileModel>> listTrash() async {
    try {
      final response = await _api.get('/files/trash', useCache: false);
      if (response.statusCode == 200) {
        final items = response.data['data']['items'] as List;
        return items.map((item) => FileModel.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      print('Error listing trash: $e');
      return [];
    }
  }
}

