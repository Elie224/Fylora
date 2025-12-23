import '../models/note.dart';
import 'api_service.dart';

class NotesService {
  final ApiService _apiService = ApiService();

  /// Créer une nouvelle note
  Future<Note> createNote(String title, {String? folderId, String? content}) async {
    try {
      final response = await _apiService.post(
        '/notes',
        data: {
          'title': title,
          'content': content ?? '',
          'folder_id': folderId,
        },
      );
      return Note.fromJson(response.data['note']);
    } catch (e) {
      throw Exception('Erreur lors de la création de la note: $e');
    }
  }

  /// Lister les notes de l'utilisateur
  Future<List<Note>> listNotes({String? folderId, bool sharedWithMe = false}) async {
    try {
      final response = await _apiService.get(
        '/notes',
        queryParameters: {
          if (folderId != null) 'folder_id': folderId,
          'shared_with_me': sharedWithMe.toString(),
        },
      );
      final notes = (response.data['notes'] as List)
          .map((e) => Note.fromJson(e))
          .toList();
      return notes;
    } catch (e) {
      throw Exception('Erreur lors du chargement des notes: $e');
    }
  }

  /// Obtenir une note spécifique
  Future<Note> getNote(String noteId) async {
    try {
      final response = await _apiService.get('/notes/$noteId');
      return Note.fromJson(response.data['note']);
    } catch (e) {
      throw Exception('Erreur lors du chargement de la note: $e');
    }
  }

  /// Mettre à jour une note
  Future<Note> updateNote(String noteId, {
    String? title,
    String? content,
    int? version,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (title != null) data['title'] = title;
      if (content != null) data['content'] = content;
      if (version != null) data['version'] = version;

      final response = await _apiService.put(
        '/notes/$noteId',
        data: data,
      );
      return Note.fromJson(response.data['note']);
    } catch (e) {
      throw Exception('Erreur lors de la mise à jour de la note: $e');
    }
  }

  /// Supprimer une note
  Future<void> deleteNote(String noteId) async {
    try {
      await _apiService.delete('/notes/$noteId');
    } catch (e) {
      throw Exception('Erreur lors de la suppression de la note: $e');
    }
  }

  /// Restaurer une note
  Future<Note> restoreNote(String noteId) async {
    try {
      final response = await _apiService.post('/notes/$noteId/restore');
      return Note.fromJson(response.data['note']);
    } catch (e) {
      throw Exception('Erreur lors de la restauration de la note: $e');
    }
  }
}

