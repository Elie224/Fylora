import 'package:flutter/foundation.dart';
import '../models/note.dart';
import '../models/note_template.dart';
import '../services/notes_service.dart';
import '../services/note_templates_service.dart';

class NotesProvider with ChangeNotifier {
  final NotesService _notesService = NotesService();
  final NoteTemplatesService _templatesService = NoteTemplatesService();

  List<Note> _notes = [];
  List<Note> _filteredNotes = [];
  Note? _currentNote;
  List<NoteTemplate> _templates = [];
  bool _isLoading = false;
  bool _isSaving = false;
  String _searchQuery = '';

  List<Note> get notes => _filteredNotes.isEmpty && _searchQuery.isEmpty ? _notes : _filteredNotes;
  Note? get currentNote => _currentNote;
  List<NoteTemplate> get templates => _templates;
  bool get isLoading => _isLoading;
  bool get isSaving => _isSaving;
  String get searchQuery => _searchQuery;

  /// Charger toutes les notes
  Future<void> loadNotes({String? folderId, bool sharedWithMe = false}) async {
    _isLoading = true;
    notifyListeners();

    try {
      _notes = await _notesService.listNotes(folderId: folderId, sharedWithMe: sharedWithMe);
      _filterNotes();
    } catch (e) {
      debugPrint('Erreur lors du chargement des notes: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Charger une note spécifique
  Future<void> loadNote(String noteId) async {
    _isLoading = true;
    notifyListeners();

    try {
      _currentNote = await _notesService.getNote(noteId);
    } catch (e) {
      debugPrint('Erreur lors du chargement de la note: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Créer une nouvelle note
  Future<Note?> createNote(String title, {String? folderId, String? content}) async {
    _isSaving = true;
    notifyListeners();

    try {
      final note = await _notesService.createNote(title, folderId: folderId, content: content);
      _notes.insert(0, note);
      _filterNotes();
      _currentNote = note;
      return note;
    } catch (e) {
      debugPrint('Erreur lors de la création de la note: $e');
      return null;
    } finally {
      _isSaving = false;
      notifyListeners();
    }
  }

  /// Mettre à jour une note
  Future<bool> updateNote(String noteId, {String? title, String? content}) async {
    _isSaving = true;
    notifyListeners();

    try {
      final updatedNote = await _notesService.updateNote(
        noteId,
        title: title,
        content: content,
        version: _currentNote?.version,
      );
      
      final index = _notes.indexWhere((n) => n.id == noteId);
      if (index != -1) {
        _notes[index] = updatedNote;
      }
      
      if (_currentNote?.id == noteId) {
        _currentNote = updatedNote;
      }
      
      _filterNotes();
      return true;
    } catch (e) {
      debugPrint('Erreur lors de la mise à jour de la note: $e');
      return false;
    } finally {
      _isSaving = false;
      notifyListeners();
    }
  }

  /// Supprimer une note
  Future<bool> deleteNote(String noteId) async {
    try {
      await _notesService.deleteNote(noteId);
      _notes.removeWhere((n) => n.id == noteId);
      if (_currentNote?.id == noteId) {
        _currentNote = null;
      }
      _filterNotes();
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint('Erreur lors de la suppression de la note: $e');
      return false;
    }
  }

  /// Rechercher dans les notes
  void searchNotes(String query) {
    _searchQuery = query.toLowerCase();
    _filterNotes();
    notifyListeners();
  }

  void _filterNotes() {
    if (_searchQuery.isEmpty) {
      _filteredNotes = _notes;
    } else {
      _filteredNotes = _notes.where((note) {
        return note.title.toLowerCase().contains(_searchQuery) ||
            note.content.toLowerCase().contains(_searchQuery);
      }).toList();
    }
  }

  /// Charger les templates
  Future<void> loadTemplates({String? category}) async {
    _isLoading = true;
    notifyListeners();

    try {
      _templates = await _templatesService.listTemplates(category: category);
    } catch (e) {
      debugPrint('Erreur lors du chargement des templates: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Créer une note depuis un template
  Future<Note?> createNoteFromTemplate(String templateId, {String? title, String? folderId}) async {
    _isSaving = true;
    notifyListeners();

    try {
      final note = await _templatesService.createNoteFromTemplate(
        templateId,
        title: title,
        folderId: folderId,
      );
      _notes.insert(0, note);
      _filterNotes();
      _currentNote = note;
      return note;
    } catch (e) {
      debugPrint('Erreur lors de la création depuis le template: $e');
      return null;
    } finally {
      _isSaving = false;
      notifyListeners();
    }
  }

  /// Réinitialiser la recherche
  void clearSearch() {
    _searchQuery = '';
    _filteredNotes = [];
    notifyListeners();
  }
}




