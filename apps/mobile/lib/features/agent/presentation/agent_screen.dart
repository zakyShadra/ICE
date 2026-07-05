import 'package:flutter/material.dart';
import '../../../shared/widgets/ice_empty_state.dart';

/// Agent — Document 1's Agent Mode (bounded, supervised multi-step
/// execution). Today, agent tasks only exist transiently inside a
/// single `Brain.handleTurn` call triggered via Chat's Planner
/// heuristic (packages/core/src/planner/planner.ts) — there is no
/// `GET /v1/agent-tasks` endpoint yet to list persisted tasks
/// (Document 3's `agent_tasks`/`agent_steps` tables exist in the
/// schema, but the REST surface over them is still Phase 3 Part C).
///
/// This screen is real, not a stub: it correctly reflects that there
/// is currently nothing to list, rather than fabricating a task list
/// against data the backend doesn't expose yet. Once the Part C
/// endpoint exists, this becomes a live list with the same
/// loading/error/empty pattern every other screen in this app uses.
///
/// No own Scaffold/AppBar — this widget is rendered as a tab body
/// inside WorkspaceShell (app/router.dart), which owns the shared
/// AppBar and bottom navigation.
class AgentScreen extends StatelessWidget {
  const AgentScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const IceEmptyState(
      message:
          'No active tasks. Ask ICE to do something multi-step in Chat and it will show up here once task tracking ships.',
      icon: Icons.smart_toy_outlined,
    );
  }
}
