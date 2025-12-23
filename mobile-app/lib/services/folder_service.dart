/// Service pour gérer les dossiers
import '../models/folder_model.dart';
import '../services/api_service.dart';
import '../utils/security.dart';

class FolderService {
  final ApiService _api = ApiService();

  /// Lister les dossiers
  Future<List<FolderModel>> listFolders({String? parentId}) async {
    try {
      final response = await _api.get(
        '/folders',
        queryParameters: parentId != null ? {'parent_id': parentId} : null,
        useCache: true,
      );

      if (response.statusCode == 200) {
        final items = response.data['data']['items'] as List;
        return items.map((item) => FolderModel.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      print('Error listing folders: $e');
      return [];
    }
  }

  /// Créer un dossier
  Future<FolderModel?> createFolder(String name, {String? parentId}) async {
    try {
      final sanitizedName = sanitizeFileName(name);
      final response = await _api.post('/folders', data: {
        'name': sanitizedName,
        if (parentId != null) 'parent_id': parentId,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        _api.invalidateCacheKey('/folders');
        return FolderModel.fromJson(response.data['data']);
      }
      return null;
    } catch (e) {
      print('Error creating folder: $e');
      return null;
    }
  }

  /// Supprimer un dossier
  Future<bool> deleteFolder(String folderId) async {
    try {
      final response = await _api.delete('/folders/$folderId');
      _api.invalidateCacheKey('/folders');
      return response.statusCode == 200;
    } catch (e) {
      print('Error deleting folder: $e');
      return false;
    }
  }

  /// Supprimer définitivement un dossier
  Future<bool> permanentDeleteFolder(String folderId) async {
    try {
      final response = await _api.delete('/folders/$folderId/permanent');
      _api.invalidateCacheKey('/folders');
      return response.statusCode == 200;
    } catch (e) {
      print('Error permanently deleting folder: $e');
      return false;
    }
  }

  /// Restaurer un dossier
  Future<bool> restoreFolder(String folderId) async {
    try {
      final response = await _api.post('/folders/$folderId/restore');
      _api.invalidateCacheKey('/folders');
      return response.statusCode == 200;
    } catch (e) {
      print('Error restoring folder: $e');
      return false;
    }
  }

  /// Renommer un dossier
  Future<bool> renameFolder(String folderId, String newName) async {
    try {
      final sanitizedName = sanitizeFileName(newName);
      final response = await _api.patch('/folders/$folderId', data: {
        'name': sanitizedName,
      });
      _api.invalidateCacheKey('/folders');
      return response.statusCode == 200;
    } catch (e) {
      print('Error renaming folder: $e');
      return false;
    }
  }

  /// Déplacer un dossier
  Future<bool> moveFolder(String folderId, String parentId) async {
    try {
      final response = await _api.patch('/folders/$folderId', data: {
        'parent_id': parentId,
      });
      _api.invalidateCacheKey('/folders');
      return response.statusCode == 200;
    } catch (e) {
      print('Error moving folder: $e');
      return false;
    }
  }

  /// Lister les dossiers de la corbeille
  Future<List<FolderModel>> listTrash() async {
    try {
      final response = await _api.get('/folders/trash', useCache: false);
      if (response.statusCode == 200) {
        final items = response.data['data']['items'] as List;
        return items.map((item) => FolderModel.fromJson(item)).toList();
      }
      return [];
    } catch (e) {
      print('Error listing trash: $e');
      return [];
    }
  }
}





