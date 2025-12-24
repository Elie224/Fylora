/// Écran de gestion des fichiers
import 'package:flutter/material.dart';
import '../models/file_model.dart';
import '../models/folder_model.dart';
import '../services/file_service.dart';
import '../services/folder_service.dart';

class FilesScreen extends StatefulWidget {
  final String? folderId;

  const FilesScreen({super.key, this.folderId});

  @override
  State<FilesScreen> createState() => _FilesScreenState();
}

class _FilesScreenState extends State<FilesScreen> {
  final FileService _fileService = FileService();
  final FolderService _folderService = FolderService();
  
  List<FileModel> _files = [];
  List<FolderModel> _folders = [];
  bool _isLoading = true;
  String? _currentFolderId;

  @override
  void initState() {
    super.initState();
    _currentFolderId = widget.folderId;
    _loadFiles();
  }

  Future<void> _loadFiles() async {
    setState(() => _isLoading = true);
    try {
      final files = await _fileService.listFiles(folderId: _currentFolderId);
      final folders = await _folderService.listFolders(parentId: _currentFolderId);
      setState(() {
        _files = files;
        _folders = folders;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erreur lors du chargement: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mes fichiers'),
        actions: [
          IconButton(
            icon: const Icon(Icons.upload_file),
            onPressed: _showUploadDialog,
            tooltip: 'Uploader',
          ),
          IconButton(
            icon: const Icon(Icons.create_new_folder),
            onPressed: _showCreateFolderDialog,
            tooltip: 'Nouveau dossier',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _files.isEmpty && _folders.isEmpty
              ? _buildEmptyState()
              : _buildFileList(isDark),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showUploadDialog,
        icon: const Icon(Icons.upload),
        label: const Text('Uploader'),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.folder_open, size: 80, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'Aucun fichier',
            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
          ),
          const SizedBox(height: 8),
          Text(
            'Appuyez sur le bouton pour uploader',
            style: TextStyle(fontSize: 14, color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  Widget _buildFileList(bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: _folders.length + _files.length,
      itemBuilder: (context, index) {
        if (index < _folders.length) {
          return _buildFolderTile(_folders[index], isDark);
        } else {
          return _buildFileTile(_files[index - _folders.length], isDark);
        }
      },
    );
  }

  Widget _buildFolderTile(FolderModel folder, bool isDark) {
    return ListTile(
      leading: const Icon(Icons.folder, color: Colors.blue),
      title: Text(folder.name),
      subtitle: Text('Dossier'),
      trailing: PopupMenuButton(
        itemBuilder: (context) => [
          const PopupMenuItem(
            value: 'open',
            child: Text('Ouvrir'),
          ),
          const PopupMenuItem(
            value: 'rename',
            child: Text('Renommer'),
          ),
          const PopupMenuItem(
            value: 'delete',
            child: Text('Supprimer'),
          ),
        ],
        onSelected: (value) => _handleFolderAction(folder, value),
      ),
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => FilesScreen(folderId: folder.id),
          ),
        );
      },
    );
  }

  Widget _buildFileTile(FileModel file, bool isDark) {
    return ListTile(
      leading: Text(file.icon, style: const TextStyle(fontSize: 32)),
      title: Text(file.name),
      subtitle: Text('${file.formattedSize} • ${_formatDate(file.updatedAt)}'),
      trailing: PopupMenuButton(
        itemBuilder: (context) => [
          const PopupMenuItem(
            value: 'download',
            child: Text('Télécharger'),
          ),
          const PopupMenuItem(
            value: 'share',
            child: Text('Partager'),
          ),
          const PopupMenuItem(
            value: 'rename',
            child: Text('Renommer'),
          ),
          const PopupMenuItem(
            value: 'delete',
            child: Text('Supprimer'),
          ),
        ],
        onSelected: (value) => _handleFileAction(file, value),
      ),
      onTap: () {
        // Naviguer vers la prévisualisation
        // Navigator.push(...);
      },
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'Aujourd\'hui';
    } else if (difference.inDays == 1) {
      return 'Hier';
    } else if (difference.inDays < 7) {
      return 'Il y a ${difference.inDays} jours';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }

  void _handleFolderAction(FolderModel folder, dynamic action) {
    switch (action) {
      case 'open':
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => FilesScreen(folderId: folder.id),
          ),
        );
        break;
      case 'rename':
        _showRenameFolderDialog(folder);
        break;
      case 'delete':
        _deleteFolder(folder);
        break;
    }
  }

  void _handleFileAction(FileModel file, dynamic action) {
    switch (action) {
      case 'download':
        _downloadFile(file);
        break;
      case 'share':
        _shareFile(file);
        break;
      case 'rename':
        _showRenameFileDialog(file);
        break;
      case 'delete':
        _deleteFile(file);
        break;
    }
  }

  Future<void> _showUploadDialog() async {
    // Implémenter avec file_picker
  }

  Future<void> _showCreateFolderDialog() async {
    final controller = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nouveau dossier'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Nom du dossier',
            hintText: 'Entrez le nom du dossier',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Créer'),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty) {
      final folder = await _folderService.createFolder(
        result,
        parentId: _currentFolderId,
      );
      if (folder != null) {
        _loadFiles();
      }
    }
  }

  Future<void> _deleteFile(FileModel file) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer le fichier'),
        content: Text('Voulez-vous vraiment supprimer "${file.name}" ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await _fileService.deleteFile(file.id);
      if (success) {
        _loadFiles();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Fichier supprimé')),
          );
        }
      }
    }
  }

  Future<void> _deleteFolder(FolderModel folder) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Supprimer le dossier'),
        content: Text('Voulez-vous vraiment supprimer "${folder.name}" ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final success = await _folderService.deleteFolder(folder.id);
      if (success) {
        _loadFiles();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Dossier supprimé')),
          );
        }
      }
    }
  }

  Future<void> _downloadFile(FileModel file) async {
    // Implémenter le téléchargement
  }

  Future<void> _shareFile(FileModel file) async {
    final link = await _fileService.shareFile(file.id);
    if (link != null && mounted) {
      // Copier le lien dans le presse-papiers
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lien de partage copié')),
      );
    }
  }

  Future<void> _showRenameFileDialog(FileModel file) async {
    final controller = TextEditingController(text: file.name);
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Renommer'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Nouveau nom',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Renommer'),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty) {
      final success = await _fileService.renameFile(file.id, result);
      if (success) {
        _loadFiles();
      }
    }
  }

  Future<void> _showRenameFolderDialog(FolderModel folder) async {
    final controller = TextEditingController(text: folder.name);
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Renommer'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Nouveau nom',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Renommer'),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty) {
      final success = await _folderService.renameFolder(folder.id, result);
      if (success) {
        _loadFiles();
      }
    }
  }
}





