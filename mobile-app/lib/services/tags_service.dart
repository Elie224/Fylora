/// Service pour gérer les tags
import '../services/api_service.dart';
import 'package:dio/dio.dart';

class TagsService {
  final ApiService _apiService = ApiService();

  /// Lister tous les tags
  Future<Response> listTags() async {
    return await _apiService.get('/tags');
  }

  /// Créer un tag
  Future<Response> createTag(String name, {String? color}) async {
    return await _apiService.post('/tags', data: {
      'name': name,
      if (color != null) 'color': color,
    });
  }

  /// Ajouter un tag à un fichier
  Future<Response> addTagToFile(String fileId, String tagId) async {
    return await _apiService.post('/tags/$tagId/files/$fileId');
  }

  /// Retirer un tag d'un fichier
  Future<Response> removeTagFromFile(String fileId, String tagId) async {
    return await _apiService.delete('/tags/$tagId/files/$fileId');
  }

  /// Obtenir les tags d'un fichier
  Future<Response> getFileTags(String fileId) async {
    return await _apiService.get('/files/$fileId/tags');
  }

  /// Rechercher des fichiers par tag
  Future<Response> searchByTag(String tagId) async {
    return await _apiService.get('/tags/$tagId/files');
  }

  /// Supprimer un tag
  Future<Response> deleteTag(String tagId) async {
    return await _apiService.delete('/tags/$tagId');
  }
}


