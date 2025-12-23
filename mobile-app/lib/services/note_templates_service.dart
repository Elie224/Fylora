import '../models/note_template.dart';
import '../models/note.dart';
import 'api_service.dart';

class NoteTemplatesService {
  final ApiService _apiService = ApiService();

  /// Lister les templates
  Future<List<NoteTemplate>> listTemplates({String? category}) async {
    try {
      final response = await _apiService.get(
        '/note-templates',
        queryParameters: category != null ? {'category': category} : null,
      );
      final templates = (response.data['templates'] as List)
          .map((e) => NoteTemplate.fromJson(e))
          .toList();
      return templates;
    } catch (e) {
      throw Exception('Erreur lors du chargement des templates: $e');
    }
  }

  /// Créer une note depuis un template
  Future<Note> createNoteFromTemplate(String templateId, {String? title, String? folderId}) async {
    try {
      final response = await _apiService.post(
        '/note-templates/$templateId/create-note',
        data: {
          if (title != null) 'title': title,
          if (folderId != null) 'folder_id': folderId,
        },
      );
      return Note.fromJson(response.data['note']);
    } catch (e) {
      throw Exception('Erreur lors de la création depuis le template: $e');
    }
  }
}




