class UserProfile {
  const UserProfile({required this.id, this.displayName, this.onboardedAt, required this.createdAt});

  final String id;
  final String? displayName;
  final DateTime? onboardedAt;
  final DateTime createdAt;

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      displayName: json['displayName'] as String?,
      onboardedAt: json['onboardedAt'] != null ? DateTime.parse(json['onboardedAt'] as String) : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
