import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../shared/widgets/ice_empty_state.dart';
import '../../../shared/widgets/ice_error_view.dart';
import '../../../shared/widgets/ice_loading_view.dart';
import '../application/project_controller.dart';

/// Coding — real project management (create/list/delete), all against
/// live `/v1/projects` endpoints. Deliberately does NOT wire projects
/// into a project-scoped chat yet: today's `Session` model and
/// `Brain.handleTurn` have no `projectId` concept (Document 3's
/// `sessions` table has no project column), so pretending a
/// "project-aware coding chat" exists here would fabricate backend
/// capability that doesn't exist. That plumbing is a real, specific
/// future addition — not something this screen should paper over.
///
/// No own Scaffold/AppBar — rendered as a tab body inside
/// WorkspaceShell, which also hosts the "new project" FAB
/// (see showCreateProjectDialog below, called from the shell).
class CodingScreen extends ConsumerStatefulWidget {
  const CodingScreen({super.key});

  @override
  ConsumerState<CodingScreen> createState() => _CodingScreenState();
}

class _CodingScreenState extends ConsumerState<CodingScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(projectControllerProvider.notifier).load());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(projectControllerProvider);
    return _buildBody(state);
  }

  Widget _buildBody(ProjectListState state) {
    if (state.isLoading && state.projects.isEmpty) {
      return const IceLoadingView();
    }

    if (state.errorMessage != null && state.projects.isEmpty) {
      return IceErrorView(
        message: state.errorMessage!,
        onRetry: () => ref.read(projectControllerProvider.notifier).load(),
      );
    }

    if (state.projects.isEmpty) {
      return const IceEmptyState(
        message: 'Connect a project to get context-aware coding help.',
        icon: Icons.folder_outlined,
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: state.projects.length,
      separatorBuilder: (_, __) => const SizedBox(height: 4),
      itemBuilder: (context, index) {
        final project = state.projects[index];
        return ListTile(
          leading: const Icon(Icons.folder_outlined),
          title: Text(project.name),
          subtitle: Text(
            'Created ${project.createdAt.year}-${project.createdAt.month.toString().padLeft(2, '0')}-${project.createdAt.day.toString().padLeft(2, '0')}',
          ),
          trailing: IconButton(
            icon: const Icon(Icons.delete_outline),
            onPressed: () => ref.read(projectControllerProvider.notifier).delete(project.id),
          ),
        );
      },
    );
  }
}

/// Shared "create project" dialog — called from WorkspaceShell's FAB
/// (only shown while the Coding tab is active) so the action lives at
/// the shell level without CodingScreen needing its own AppBar.
Future<void> showCreateProjectDialog(BuildContext context, WidgetRef ref) async {
  final controller = TextEditingController();
  final name = await showDialog<String>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('New project'),
      content: TextField(
        controller: controller,
        autofocus: true,
        decoration: const InputDecoration(hintText: 'Project name'),
        onSubmitted: (value) => Navigator.of(context).pop(value),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.of(context).pop(controller.text), child: const Text('Create')),
      ],
    ),
  );

  if (name != null && name.trim().isNotEmpty) {
    await ref.read(projectControllerProvider.notifier).create(name.trim());
  }
}
