import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/ice_empty_state.dart';
import '../../../shared/widgets/ice_error_view.dart';
import '../../../shared/widgets/ice_loading_view.dart';
import '../../../shared/widgets/ice_message_bubble.dart';
import '../application/chat_controller.dart';

/// Chat — fully working against the real backend. Loads or creates a
/// session, loads real history, sends real messages, shows a real
/// sending indicator while waiting on the round trip through Router ->
/// Provider -> Brain (Document 2, Section 5.1).
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _inputController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(chatControllerProvider.notifier).initialize());
  }

  @override
  void dispose() {
    _inputController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) return;
    _scrollController.animateTo(
      _scrollController.position.maxScrollExtent + 80,
      duration: const Duration(milliseconds: 250),
      curve: Curves.easeOut,
    );
  }

  Future<void> _send() async {
    final text = _inputController.text;
    if (text.trim().isEmpty) return;
    _inputController.clear();
    await ref.read(chatControllerProvider.notifier).sendMessage(text);
    if (mounted) _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(chatControllerProvider);

    return Column(
      children: [
        Expanded(child: _buildBody(state)),
        _buildComposer(state),
      ],
    );
  }

  Widget _buildBody(ChatScreenState state) {
    if (state.isLoadingHistory) {
      return const IceLoadingView();
    }

    if (state.errorMessage != null && state.messages.isEmpty) {
      return IceErrorView(
        message: state.errorMessage!,
        onRetry: () => ref.read(chatControllerProvider.notifier).initialize(),
      );
    }

    if (state.messages.isEmpty) {
      return const IceEmptyState(message: 'Nothing here yet — say something to get started.');
    }

    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToBottom());

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(vertical: 12),
      itemCount: state.messages.length,
      itemBuilder: (context, index) => IceMessageBubble(message: state.messages[index]),
    );
  }

  Widget _buildComposer(ChatScreenState state) {
    final theme = Theme.of(context);
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _inputController,
                minLines: 1,
                maxLines: 5,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: const InputDecoration(hintText: 'Message ICE...'),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: state.isSending ? null : _send,
              icon: state.isSending
                  ? SizedBox(
                      height: 18,
                      width: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: theme.colorScheme.onPrimary),
                    )
                  : const Icon(Icons.arrow_upward_rounded),
            ),
          ],
        ),
      ),
    );
  }
}
