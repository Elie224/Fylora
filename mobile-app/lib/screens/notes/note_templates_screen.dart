import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/notes_provider.dart';
import '../../models/note_template.dart';
import 'note_edit_screen.dart';

class NoteTemplatesScreen extends StatefulWidget {
  const NoteTemplatesScreen({super.key});

  @override
  State<NoteTemplatesScreen> createState() => _NoteTemplatesScreenState();
}

class _NoteTemplatesScreenState extends State<NoteTemplatesScreen> {
  String _selectedCategory = '';

  final Map<String, String> _categoryIcons = {
    '': '📋',
    'general': '📄',
    'meeting': '👥',
    'project': '📊',
    'personal': '👤',
    'work': '💼',
    'education': '📚',
  };

  final List<Map<String, String>> _categories = [
    {'value': '', 'label': 'Tous'},
    {'value': 'general', 'label': 'Général'},
    {'value': 'meeting', 'label': 'Réunion'},
    {'value': 'project', 'label': 'Projet'},
    {'value': 'personal', 'label': 'Personnel'},
    {'value': 'work', 'label': 'Travail'},
    {'value': 'education', 'label': 'Éducation'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotesProvider>().loadTemplates();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('📋 Templates de notes'),
      ),
      body: Consumer<NotesProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.templates.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          final filteredTemplates = _selectedCategory.isEmpty
              ? provider.templates
              : provider.templates.where((t) => t.category == _selectedCategory).toList();

          return Column(
            children: [
              // Filtres de catégories
              SizedBox(
                height: 60,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                  itemCount: _categories.length,
                  itemBuilder: (context, index) {
                    final category = _categories[index];
                    final isSelected = _selectedCategory == category['value'];
                    
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: FilterChip(
                        label: Text('${_categoryIcons[category['value']]} ${category['label']}'),
                        selected: isSelected,
                        onSelected: (selected) {
                          setState(() {
                            _selectedCategory = selected ? category['value']! : '';
                          });
                        },
                      ),
                    );
                  },
                ),
              ),

              // Liste des templates
              Expanded(
                child: filteredTemplates.isEmpty
                    ? const Center(
                        child: Text('Aucun template disponible'),
                      )
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 16,
                          mainAxisSpacing: 16,
                          childAspectRatio: 0.8,
                        ),
                        itemCount: filteredTemplates.length,
                        itemBuilder: (context, index) {
                          final template = filteredTemplates[index];
                          return _TemplateCard(template: template);
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _TemplateCard extends StatelessWidget {
  final NoteTemplate template;

  const _TemplateCard({required this.template});

  String _getCategoryIcon(String category) {
    const icons = {
      'general': '📄',
      'meeting': '👥',
      'project': '📊',
      'personal': '👤',
      'work': '💼',
      'education': '📚',
    };
    return icons[category] ?? '📋';
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: () async {
          final provider = context.read<NotesProvider>();
          final note = await provider.createNoteFromTemplate(template.id!);
          
          if (note != null && context.mounted) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (_) => NoteEditScreen(noteId: note.id!),
              ),
            );
          }
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                _getCategoryIcon(template.category),
                style: const TextStyle(fontSize: 48),
              ),
              const SizedBox(height: 12),
              Text(
                template.name,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              if (template.description != null) ...[
                const SizedBox(height: 8),
                Text(
                  template.description!,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const Spacer(),
              Text(
                '${template.usageCount} utilisation${template.usageCount > 1 ? 's' : ''}',
                style: TextStyle(
                  fontSize: 11,
                  color: Colors.grey[500],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}




