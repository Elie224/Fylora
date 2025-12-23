class NoteTemplate {
  final String? id;
  final String name;
  final String? description;
  final String content;
  final String category;
  final bool isPublic;
  final String? createdBy;
  final int usageCount;
  final DateTime createdAt;

  NoteTemplate({
    this.id,
    required this.name,
    this.description,
    required this.content,
    this.category = 'general',
    this.isPublic = false,
    this.createdBy,
    this.usageCount = 0,
    required this.createdAt,
  });

  factory NoteTemplate.fromJson(Map<String, dynamic> json) {
    return NoteTemplate(
      id: json['_id'] ?? json['id'],
      name: json['name'] ?? '',
      description: json['description'],
      content: json['content'] ?? '',
      category: json['category'] ?? 'general',
      isPublic: json['is_public'] ?? false,
      createdBy: json['created_by']?['_id'] ?? json['created_by'],
      usageCount: json['usage_count'] ?? 0,
      createdAt: DateTime.parse(json['created_at'] ?? json['createdAt']),
    );
  }
}




