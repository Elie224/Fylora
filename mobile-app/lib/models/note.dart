class Note {
  final String? id;
  final String title;
  final String content;
  final String ownerId;
  final String? folderId;
  final List<SharedWith> sharedWith;
  final bool isPublic;
  final String? publicToken;
  final int version;
  final String? lastModifiedBy;
  final bool isDeleted;
  final DateTime? deletedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  Note({
    this.id,
    required this.title,
    required this.content,
    required this.ownerId,
    this.folderId,
    this.sharedWith = const [],
    this.isPublic = false,
    this.publicToken,
    this.version = 1,
    this.lastModifiedBy,
    this.isDeleted = false,
    this.deletedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Note.fromJson(Map<String, dynamic> json) {
    return Note(
      id: json['_id'] ?? json['id'],
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      ownerId: json['owner_id']?['_id'] ?? json['owner_id'] ?? '',
      folderId: json['folder_id']?['_id'] ?? json['folder_id'],
      sharedWith: (json['shared_with'] as List?)
          ?.map((e) => SharedWith.fromJson(e))
          .toList() ?? [],
      isPublic: json['is_public'] ?? false,
      publicToken: json['public_token'],
      version: json['version'] ?? 1,
      lastModifiedBy: json['last_modified_by']?['_id'] ?? json['last_modified_by'],
      isDeleted: json['is_deleted'] ?? false,
      deletedAt: json['deleted_at'] != null ? DateTime.parse(json['deleted_at']) : null,
      createdAt: DateTime.parse(json['created_at'] ?? json['createdAt']),
      updatedAt: DateTime.parse(json['updated_at'] ?? json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'content': content,
      'folder_id': folderId,
      'version': version,
    };
  }
}

class SharedWith {
  final String userId;
  final String permission; // 'read', 'write', 'admin'

  SharedWith({
    required this.userId,
    required this.permission,
  });

  factory SharedWith.fromJson(Map<String, dynamic> json) {
    return SharedWith(
      userId: json['user_id']?['_id'] ?? json['user_id'] ?? '',
      permission: json['permission'] ?? 'read',
    );
  }
}




