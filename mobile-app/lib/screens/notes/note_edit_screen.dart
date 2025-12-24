import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_quill/flutter_quill.dart' as quill;
import '../../providers/notes_provider.dart';
import '../../models/note.dart';

class NoteEditScreen extends StatefulWidget {
  final String noteId;

  const NoteEditScreen({super.key, required this.noteId});

  @override
  State<NoteEditScreen> createState() => _NoteEditScreenState();
}

class _NoteEditScreenState extends State<NoteEditScreen> {
  late quill.QuillController _quillController;
  late TextEditingController _titleController;
  bool _isSaving = false;
  DateTime? _lastSaved;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _quillController = quill.QuillController.basic();
    _loadNote();
  }

  Future<void> _loadNote() async {
    final provider = context.read<NotesProvider>();
    await provider.loadNote(widget.noteId);
    
    if (provider.currentNote != null) {
      final note = provider.currentNote!;
      _titleController.text = note.title;
      try {
        if (note.content.isNotEmpty) {
          try {
            // Essayer de parser comme JSON Quill
            final contentJson = note.content;
            if (contentJson.startsWith('[') || contentJson.startsWith('{')) {
              _quillController.document = quill.Document.fromJson(
                jsonDecode(contentJson) as List<dynamic>,
              );
            } else {
              // Sinon, utiliser comme texte brut
              _quillController.document = quill.Document()..insert(0, note.content);
            }
          } catch (e) {
            // Si le contenu n'est pas au format Quill, utiliser le texte brut
            _quillController.document = quill.Document()..insert(0, note.content);
          }
        }
      } catch (e) {
        // Si le contenu n'est pas au format Quill, utiliser le texte brut
        _quillController.document = quill.Document()..insert(0, note.content);
      }
    }
  }

  Future<void> _saveNote() async {
    if (_isSaving) return;

    setState(() {
      _isSaving = true;
    });

    final provider = context.read<NotesProvider>();
    final contentJson = jsonEncode(_quillController.document.toDelta().toJson());
    
    final success = await provider.updateNote(
      widget.noteId,
      title: _titleController.text,
      content: contentJson,
    );

    setState(() {
      _isSaving = false;
      if (success) {
        _lastSaved = DateTime.now();
      }
    });

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Note enregistrée')),
      );
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _quillController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _titleController,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          decoration: const InputDecoration(
            hintText: 'Titre de la note',
            border: InputBorder.none,
          ),
        ),
        actions: [
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else if (_lastSaved != null)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Icon(Icons.check, color: Colors.green),
            ),
          IconButton(
            icon: const Icon(Icons.save),
            onPressed: _saveNote,
            tooltip: 'Enregistrer',
          ),
        ],
      ),
      body: Column(
        children: [
          // Barre d'outils de l'éditeur (temporairement désactivée - API flutter_quill 11.5.0)
          // TODO: Implémenter avec la bonne API de QuillToolbar
          
          // Éditeur
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              child: quill.QuillEditor.basic(
                controller: _quillController,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

