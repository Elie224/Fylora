/// Modèle de fichier pour l'application mobile
class FileModel {
  final String id;
  final String name;
  final int size;
  final String mimeType;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? folderId;
  final String ownerId;
  final bool isDeleted;
  final String? filePath;

  FileModel({
    required this.id,
    required this.name,
    required this.size,
    required this.mimeType,
    required this.createdAt,
    required this.updatedAt,
    this.folderId,
    required this.ownerId,
    this.isDeleted = false,
    this.filePath,
  });

  factory FileModel.fromJson(Map<String, dynamic> json) {
    return FileModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      size: json['size'] ?? 0,
      mimeType: json['mime_type'] ?? json['mimeType'] ?? 'application/octet-stream',
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : DateTime.now(),
      folderId: json['folder_id'] ?? json['folderId'],
      ownerId: json['owner_id'] ?? json['ownerId'] ?? '',
      isDeleted: json['is_deleted'] ?? json['isDeleted'] ?? false,
      filePath: json['file_path'] ?? json['filePath'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'size': size,
      'mime_type': mimeType,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'folder_id': folderId,
      'owner_id': ownerId,
      'is_deleted': isDeleted,
      'file_path': filePath,
    };
  }

  /// Formater la taille du fichier
  String get formattedSize {
    if (size < 1024) return '$size B';
    if (size < 1024 * 1024) return '${(size / 1024).toStringAsFixed(2)} KB';
    if (size < 1024 * 1024 * 1024) {
      return '${(size / (1024 * 1024)).toStringAsFixed(2)} MB';
    }
    return '${(size / (1024 * 1024 * 1024)).toStringAsFixed(2)} GB';
  }

  /// Obtenir l'icône selon le type MIME
  String get icon {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType == 'application/pdf') return '📄';
    if (mimeType.startsWith('text/')) return '📝';
    return '📎';
  }
}





