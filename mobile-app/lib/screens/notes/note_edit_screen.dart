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
          final delta = quill.Delta.fromJson(
            quill.Document.fromJson(note.content).toDelta().toJson()
          );
          _quillController.document = quill.Document.fromDelta(delta);
        }
      } catch (e) {
        // Si le contenu n'est pas au format Quill, utiliser le texte brut
        _quillController.document = quill.Document.fromDelta(
          quill.Delta()..insert(note.content),
        );
      }
    }
  }

  Future<void> _saveNote() async {
    if (_isSaving) return;

    setState(() {
      _isSaving = true;
    });

    final provider = context.read<NotesProvider>();
    final deltaJson = _quillController.document.toDelta().toJson();
    final contentJson = _quillController.document.toJson();
    
    final success = await provider.updateNote(
      widget.noteId,
      title: _titleController.text,
      content: contentJson.toString(),
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
          // Barre d'outils de l'éditeur
          quill.QuillToolbar.simple(
            configurations: quill.QuillSimpleToolbarConfigurations(
              controller: _quillController,
              sharedConfigurations: const quill.QuillSharedConfigurations(),
            ),
          ),
          
          // Éditeur
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(16),
              child: quill.QuillEditor.basic(
                configurations: quill.QuillEditorConfigurations(
                  controller: _quillController,
                  placeholder: 'Commencez à écrire...',
                  sharedConfigurations: const quill.QuillSharedConfigurations(),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

