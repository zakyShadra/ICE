import '../../../core/network/api_client.dart';
import '../domain/chat_models.dart';

/// ChatRepository — calls the REAL backend endpoints built in Phase 3
/// Part B (`POST/GET /v1/chats`, `POST/GET /v1/chats/:id/messages`).
/// Every method here maps 1:1 to a working route — nothing here is
/// speculative against an endpoint that doesn't exist yet.
class ChatRepository {
  ChatRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<ChatSession> createSession({String? title}) async {
    final response = await _apiClient.post('/v1/chats', body: {
      if (title != null) 'title': title,
    });
    return ChatSession.fromJson(response['session'] as Map<String, dynamic>);
  }

  Future<List<ChatSession>> listSessions() async {
    final response = await _apiClient.get('/v1/chats');
    final sessions = response['sessions'] as List<dynamic>;
    return sessions.map((s) => ChatSession.fromJson(s as Map<String, dynamic>)).toList();
  }

  Future<List<ChatMessage>> getHistory(String sessionId) async {
    final response = await _apiClient.get('/v1/chats/$sessionId/messages');
    final messages = response['messages'] as List<dynamic>;
    return messages.map((m) => ChatMessage.fromJson(m as Map<String, dynamic>)).toList();
  }

  /// Sends a message and returns both persisted messages the backend
  /// created (user + assistant) — Document 2, Section 5.1's data flow,
  /// literally what ChatService.sendMessage on the backend returns.
  Future<({ChatMessage userMessage, ChatMessage assistantMessage})> sendMessage({
    required String sessionId,
    required String input,
    String? preferredProvider,
  }) async {
    final response = await _apiClient.post('/v1/chats/$sessionId/messages', body: {
      'input': input,
      if (preferredProvider != null) 'preferredProvider': preferredProvider,
    });

    return (
      userMessage: ChatMessage.fromJson(response['userMessage'] as Map<String, dynamic>),
      assistantMessage: ChatMessage.fromJson(response['assistantMessage'] as Map<String, dynamic>),
    );
  }
}
