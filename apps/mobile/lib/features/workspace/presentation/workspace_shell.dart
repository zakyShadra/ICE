import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../coding/presentation/coding_screen.dart';

/// WorkspaceShell — the bottom-nav container for Chat/Agent/Coding/
/// Settings. Built as the `builder` for a StatefulShellRoute
/// (see app/router.dart) so each tab keeps its own navigation state
/// and scroll position when switching tabs, rather than rebuilding
/// from scratch every time (Document 1, Section 7.2: calm, not
/// jarring, interaction).
///
/// Owns the single shared AppBar (title changes per tab) and the
/// Coding tab's "new project" FAB, since neither Chat, Agent, Coding,
/// nor Settings screens have their own Scaffold — they're pure tab
/// bodies.
class WorkspaceShell extends ConsumerWidget {
  const WorkspaceShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  static const _titles = ['Chat', 'Agent', 'Coding', 'Settings'];

  static const _destinations = [
    NavigationDestination(icon: Icon(Icons.chat_bubble_outline), selectedIcon: Icon(Icons.chat_bubble), label: 'Chat'),
    NavigationDestination(icon: Icon(Icons.smart_toy_outlined), selectedIcon: Icon(Icons.smart_toy), label: 'Agent'),
    NavigationDestination(icon: Icon(Icons.code_outlined), selectedIcon: Icon(Icons.code), label: 'Coding'),
    NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = navigationShell.currentIndex;
    final isCodingTab = currentIndex == 2;

    return Scaffold(
      appBar: AppBar(
        title: Text(_titles[currentIndex]),
        actions: [
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => context.push('/profile'),
          ),
        ],
      ),
      body: navigationShell,
      floatingActionButton: isCodingTab
          ? FloatingActionButton(
              onPressed: () => showCreateProjectDialog(context, ref),
              child: const Icon(Icons.add),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        destinations: _destinations,
        onDestinationSelected: (index) => navigationShell.goBranch(
          index,
          initialLocation: index == currentIndex,
        ),
      ),
    );
  }
}
