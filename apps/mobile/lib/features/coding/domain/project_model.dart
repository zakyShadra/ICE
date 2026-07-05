class Project {
  const Project({required this.id, required this.userId, required this.name, required this.createdAt});

  final String id;
  final String userId;
  final String name;
  final DateTime createdAt;

  factory Project.fromJson(Map<String, dynamic> json) {
    return Project(
      id: json['id'] as String,
      userId: json['userId'] as String,
      name: json['name'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
