import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/di/providers.dart';
import '../../../app/router.dart';
import '../../auth/application/auth_controller.dart';

/// Settings — the two controls here (theme, sign out) are fully real
/// and functional today. Provider toggles and routing-mode selection
/// are NOT wired to a backend call: `user_settings` has no REST
/// endpoint yet (Document 3's schema has the table; Phase 3 Part C is
/// where `GET/PATCH /v1/settings` would land). Rather than fake a
/// working preferences screen against a nonexistent endpoint, those
/// sections are visibly present (so the intended shape of Settings is
/// clear) but explicitly marked as not-yet-connected, with the real,
/// working controls (theme, sign out) clearly functional above them.
///
/// No own Scaffold/AppBar — rendered as a tab body inside
/// WorkspaceShell.
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final theme = Theme.of(context);

    return ListView(
      children: [
          const _SectionHeader('Appearance'),
          RadioListTile<ThemeMode>(
            title: const Text('System'),
            value: ThemeMode.system,
            groupValue: themeMode,
            onChanged: (value) => ref.read(themeModeProvider.notifier).state = value!,
          ),
          RadioListTile<ThemeMode>(
            title: const Text('Light'),
            value: ThemeMode.light,
            groupValue: themeMode,
            onChanged: (value) => ref.read(themeModeProvider.notifier).state = value!,
          ),
          RadioListTile<ThemeMode>(
            title: const Text('Dark'),
            value: ThemeMode.dark,
            groupValue: themeMode,
            onChanged: (value) => ref.read(themeModeProvider.notifier).state = value!,
          ),
          const Divider(height: 32),
          const _SectionHeader('AI Providers'),
          const _NotYetConnectedTile(
            icon: Icons.hub_outlined,
            title: 'Enabled providers',
            subtitle: 'Backend settings endpoint not built yet (Phase 3 Part C).',
          ),
          const _NotYetConnectedTile(
            icon: Icons.tune,
            title: 'Routing mode',
            subtitle: 'Automatic (fixed until settings endpoint ships).',
          ),
          const Divider(height: 32),
          const _SectionHeader('Memory'),
          const _NotYetConnectedTile(
            icon: Icons.memory_outlined,
            title: 'View & manage what ICE remembers',
            subtitle: 'Memory viewer endpoint not built yet.',
          ),
          const Divider(height: 32),
          ListTile(
            leading: Icon(Icons.logout, color: theme.colorScheme.error),
            title: Text('Sign out', style: TextStyle(color: theme.colorScheme.error)),
            onTap: () async {
              await ref.read(authControllerProvider.notifier).signOut();
              if (context.mounted) context.go(AppRoutes.login);
            },
          ),
        ],
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.label);
  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
      child: Text(label, style: Theme.of(context).textTheme.labelLarge),
    );
  }
}

class _NotYetConnectedTile extends StatelessWidget {
  const _NotYetConnectedTile({required this.icon, required this.title, required this.subtitle});
  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      leading: Icon(icon, color: theme.colorScheme.onSurfaceVariant),
      title: Text(title),
      subtitle: Text(subtitle, style: theme.textTheme.bodySmall),
      enabled: false,
    );
  }
}
