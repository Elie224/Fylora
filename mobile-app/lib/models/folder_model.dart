/// Modèle de dossier pour l'application mobile
class FolderModel {
  final String id;
  final String name;
  final String? parentId;
  final String ownerId;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isDeleted;

  FolderModel({
    required this.id,
    required this.name,
    this.parentId,
    required this.ownerId,
    required this.createdAt,
    required this.updatedAt,
    this.isDeleted = false,
  });

  factory FolderModel.fromJson(Map<String, dynamic> json) {
    return FolderModel(
      id: json['id'] ?? json['_id'] ?? '',
      name: json['name'] ?? '',
      parentId: json['parent_id'] ?? json['parentId'],
      ownerId: json['owner_id'] ?? json['ownerId'] ?? '',
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : DateTime.now(),
      isDeleted: json['is_deleted'] ?? json['isDeleted'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'parent_id': parentId,
      'owner_id': ownerId,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'is_deleted': isDeleted,
    };
  }
}





