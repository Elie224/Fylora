/// Service de recherche
import '../models/file_model.dart';
import '../models/folder_model.dart';
import '../services/api_service.dart';

class SearchService {
  final ApiService _api = ApiService();

  /// Rechercher des fichiers et dossiers
  Future<Map<String, dynamic>> search({
    String? query,
    String? type,
    String? mimeType,
    DateTime? dateFrom,
    DateTime? dateTo,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (query != null && query.isNotEmpty) {
        queryParams['q'] = query;
      }
      if (type != null && type != 'all') {
        queryParams['type'] = type;
      }
      if (mimeType != null && mimeType.isNotEmpty) {
        queryParams['mime_type'] = mimeType;
      }
      if (dateFrom != null) {
        queryParams['date_from'] = dateFrom.toIso8601String();
      }
      if (dateTo != null) {
        queryParams['date_to'] = dateTo.toIso8601String();
      }

      final response = await _api.get(
        '/search',
        queryParameters: queryParams,
        useCache: false,
      );

      if (response.statusCode == 200) {
        final data = response.data['data'];
        return {
          'files': (data['files'] as List?)
                  ?.map((item) => FileModel.fromJson(item))
                  .toList() ??
              [],
          'folders': (data['folders'] as List?)
                  ?.map((item) => FolderModel.fromJson(item))
                  .toList() ??
              [],
        };
      }
      return {'files': <FileModel>[], 'folders': <FolderModel>[]};
    } catch (e) {
      print('Error searching: $e');
      return {'files': <FileModel>[], 'folders': <FolderModel>[]};
    }
  }
}





