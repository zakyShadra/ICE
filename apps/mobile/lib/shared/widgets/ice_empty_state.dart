import 'package:flutter/material.dart';

/// Shared empty-state layout — used across Chat, Agent, and Coding
/// screens so "nothing here yet" always looks and reads the same way,
/// per Document 1, Section 7.3's consistent-voice requirement.
class IceEmptyState extends StatelessWidget {
  const IceEmptyState({required this.message, this.icon = Icons.chat_bubble_outline, super.key});

  final String message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 40, color: theme.colorScheme.onSurfaceVariant),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}
