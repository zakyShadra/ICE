import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/di/providers.dart';
import '../../../core/network/api_exception.dart';
import '../data/chat_repository.dart';
import '../domain/chat_models.dart';

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  return ChatRepository(ref.watch(apiClientProvider));
});

class ChatScreenState {
  const ChatScreenState({
    this.session,
    this.messages = const [],
    this.isLoadingHistory = false,
    this.isSending = false,
    this.errorMessage,
  });

  final ChatSession? session;
  final List<ChatMessage> messages;
  final bool isLoadingHistory;
  final bool isSending;
  final String? errorMessage;

  ChatScreenState copyWith({
    ChatSession? session,
    List<ChatMessage>? messages,
    bool? isLoadingHistory,
    bool? isSending,
    String? errorMessage,
  }) {
    return ChatScreenState(
      session: session ?? this.session,
      messages: messages ?? this.messages,
      isLoadingHistory: isLoadingHistory ?? this.isLoadingHistory,
      isSending: isSending ?? this.isSending,
      errorMessage: errorMessage,
    );
  }
}

/// ChatController — owns one conversation's state. Ensures a session
/// exists (creating one on first use, exactly like a fresh "new chat"
/// would), loads real history, and sends real messages through
/// ChatRepository. No mocked or locally-fabricated messages anywhere
/// in this class — every ChatMessage in state came from the backend.
class ChatController extends StateNotifier<ChatScreenState> {
  ChatController(this._repository) : super(const ChatScreenState());

  final ChatRepository _repository;

  Future<void> initialize() async {
    state = state.copyWith(isLoadingHistory: true, errorMessage: null);
    try {
      final sessions = await _repository.listSessions();
      final session = sessions.isNotEmpty ? sessions.first : await _repository.createSession();
      final history = await _repository.getHistory(session.id);
      state = state.copyWith(session: session, messages: history, isLoadingHistory: false);
    } on ApiException catch (error) {
      state = state.copyWith(isLoadingHistory: false, errorMessage: error.message);
    }
  }

  Future<void> sendMessage(String input) async {
    final session = state.session;
    if (session == null || input.trim().isEmpty) return;

    state = state.copyWith(isSending: true, errorMessage: null);

    try {
      final result = await _repository.sendMessage(sessionId: session.id, input: input.trim());
      state = state.copyWith(
        messages: [...state.messages, result.userMessage, result.assistantMessage],
        isSending: false,
      );
    } on ApiException catch (error) {
      state = state.copyWith(isSending: false, errorMessage: error.message);
    }
  }
}

final chatControllerProvider = StateNotifierProvider<ChatController, ChatScreenState>((ref) {
  return ChatController(ref.watch(chatRepositoryProvider));
});
