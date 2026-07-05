import 'package:equatable/equatable.dart';

/// Mirrors the backend's ChatSession shape (apps/backend, Chat module,
/// Document 3 `sessions` table) — no shared codegen with @ice/types yet
/// (packages/sdk is future work per Document 2, Section 9), so this is
/// hand-maintained against the real JSON the API returns.
class ChatSession extends Equatable {
  const ChatSession({required this.id, required this.userId, this.title, required this.createdAt});

  final String id;
  final String userId;
  final String? title;
  final DateTime createdAt;

  factory ChatSession.fromJson(Map<String, dynamic> json) {
    return ChatSession(
      id: json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  @override
  List<Object?> get props => [id, userId, title, createdAt];
}

class ChatMessage extends Equatable {
  const ChatMessage({
    required this.id,
    required this.sessionId,
    required this.role,
    required this.content,
    this.providerUsed,
    required this.createdAt,
  });

  final String id;
  final String sessionId;
  final String role; // 'user' | 'assistant' | 'system'
  final String content;
  final String? providerUsed;
  final DateTime createdAt;

  bool get isUser => role == 'user';

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] as String,
      sessionId: json['sessionId'] as String,
      role: json['role'] as String,
      content: json['content'] as String,
      providerUsed: json['providerUsed'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  @override
  List<Object?> get props => [id, sessionId, role, content, providerUsed, createdAt];
}
