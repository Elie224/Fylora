import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../providers/notes_provider.dart';
import '../../models/note.dart';
import 'note_edit_screen.dart';
import 'note_templates_screen.dart';

class NotesListScreen extends StatefulWidget {
  const NotesListScreen({super.key});

  @override
  State<NotesListScreen> createState() => _NotesListScreenState();
}

class _NotesListScreenState extends State<NotesListScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotesProvider>().loadNotes();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('📝 Notes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.description),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const NoteTemplatesScreen()),
              );
            },
            tooltip: 'Templates',
          ),
        ],
      ),
      body: Consumer<NotesProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.notes.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          return Column(
            children: [
              // Barre de recherche
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: '🔍 Rechercher une note...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              provider.clearSearch();
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onChanged: (value) {
                    provider.searchNotes(value);
                  },
                ),
              ),

              // Liste des notes
              Expanded(
                child: provider.notes.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.note_outlined, size: 64, color: Colors.grey),
                            const SizedBox(height: 16),
                            const Text(
                              'Aucune note',
                              style: TextStyle(fontSize: 18, color: Colors.grey),
                            ),
                            const SizedBox(height: 8),
                            ElevatedButton.icon(
                              onPressed: () => _createNewNote(context, provider),
                              icon: const Icon(Icons.add),
                              label: const Text('Créer une note'),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        itemCount: provider.notes.length,
                        itemBuilder: (context, index) {
                          final note = provider.notes[index];
                          return _NoteItem(note: note);
                        },
                      ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _createNewNote(context, context.read<NotesProvider>()),
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle note'),
      ),
    );
  }

  void _createNewNote(BuildContext context, NotesProvider provider) async {
    final note = await provider.createNote('Nouvelle note');
    if (note != null && mounted) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => NoteEditScreen(noteId: note.id!),
        ),
      );
    }
  }
}

class _NoteItem extends StatelessWidget {
  final Note note;

  const _NoteItem({required this.note});

  @override
  Widget build(BuildContext context) {
    final contentPreview = note.content
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .substring(0, note.content.length > 100 ? 100 : note.content.length);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        title: Text(
          note.title,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(
              contentPreview,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12),
            ),
            const SizedBox(height: 4),
            Text(
              _formatDate(note.updatedAt),
              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => NoteEditScreen(noteId: note.id!),
            ),
          );
        },
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      if (difference.inHours == 0) {
        return 'Il y a ${difference.inMinutes} min';
      }
      return 'Il y a ${difference.inHours} h';
    } else if (difference.inDays == 1) {
      return 'Hier';
    } else if (difference.inDays < 7) {
      return 'Il y a ${difference.inDays} jours';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}




