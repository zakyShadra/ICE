import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/ice_error_view.dart';
import '../../../shared/widgets/ice_loading_view.dart';
import '../../../shared/widgets/ice_primary_button.dart';
import '../application/profile_controller.dart';

/// Profile — fully real: fetches from `GET /v1/profile`, edits and
/// saves via `PATCH /v1/profile` (Phase 3 Part A). Not scoped-down —
/// this is the one screen in Part B with no real-backend ceiling to
/// flag.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final _nameController = TextEditingController();
  bool _dirty = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(profileControllerProvider.notifier).load());
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(profileControllerProvider);

    ref.listen(profileControllerProvider, (previous, next) {
      if (next.profile != null && _nameController.text.isEmpty) {
        _nameController.text = next.profile!.displayName ?? '';
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: _buildBody(state),
    );
  }

  Widget _buildBody(ProfileState state) {
    if (state.isLoading && state.profile == null) {
      return const IceLoadingView();
    }

    if (state.errorMessage != null && state.profile == null) {
      return IceErrorView(
        message: state.errorMessage!,
        onRetry: () => ref.read(profileControllerProvider.notifier).load(),
      );
    }

    final profile = state.profile;
    if (profile == null) return const SizedBox.shrink();

    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 32,
            child: Text(
              (profile.displayName?.isNotEmpty ?? false) ? profile.displayName![0].toUpperCase() : '?',
              style: theme.textTheme.headlineMedium,
            ),
          ),
          const SizedBox(height: 24),
          Text('Display name', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          TextField(
            controller: _nameController,
            onChanged: (_) => setState(() => _dirty = true),
            decoration: const InputDecoration(hintText: 'How should ICE address you?'),
          ),
          const SizedBox(height: 16),
          if (state.errorMessage != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(state.errorMessage!, style: TextStyle(color: theme.colorScheme.error)),
            ),
          if (_dirty)
            IcePrimaryButton(
              label: 'Save',
              isLoading: state.isSaving,
              onPressed: () async {
                final success = await ref
                    .read(profileControllerProvider.notifier)
                    .updateDisplayName(_nameController.text.trim());
                if (success && mounted) setState(() => _dirty = false);
              },
            ),
          const Spacer(),
          Text(
            'Member since ${profile.createdAt.year}-${profile.createdAt.month.toString().padLeft(2, '0')}-${profile.createdAt.day.toString().padLeft(2, '0')}',
            style: theme.textTheme.bodySmall,
          ),
        ],
      ),
    );
  }
}
