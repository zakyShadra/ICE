import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/agent/presentation/agent_screen.dart';
import '../features/auth/application/auth_controller.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/chat/presentation/chat_screen.dart';
import '../features/coding/presentation/coding_screen.dart';
import '../features/profile/presentation/profile_screen.dart';
import '../features/settings/presentation/settings_screen.dart';
import '../features/splash/presentation/splash_screen.dart';
import '../features/workspace/presentation/workspace_shell.dart';

/// Route paths — named constants so a typo in a route string is a
/// compile error at the call site, not a silent navigation no-op.
///
/// Part B completes this file: Workspace's four tabs (Chat/Agent/
/// Coding/Settings) now exist as a StatefulShellRoute, plus a
/// standalone Profile route pushed on top of the shell.
abstract class AppRoutes {
  static const splash = '/';
  static const login = '/login';
  static const workspace = '/workspace';
  static const chat = '/workspace/chat';
  static const agent = '/workspace/agent';
  static const coding = '/workspace/coding';
  static const settings = '/workspace/settings';
  static const profile = '/profile';
}

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: AppRoutes.splash,
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.profile,
        builder: (context, state) => const ProfileScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => WorkspaceShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: AppRoutes.chat, builder: (context, state) => const ChatScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: AppRoutes.agent, builder: (context, state) => const AgentScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: AppRoutes.coding, builder: (context, state) => const CodingScreen()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: AppRoutes.settings, builder: (context, state) => const SettingsScreen()),
          ]),
        ],
      ),
    ],
    redirect: (context, state) {
      final authStatus = ref.read(authControllerProvider).status;
      final isGoingToLogin = state.matchedLocation == AppRoutes.login;
      final isGoingToSplash = state.matchedLocation == AppRoutes.splash;

      // Splash owns the "figure out where to go" decision itself
      // (it calls restoreSession then navigates) — the redirect here
      // only handles the steady-state cases once auth status is known.
      if (isGoingToSplash) {
        return null;
      }

      if (authStatus == AuthStatus.unauthenticated && !isGoingToLogin) {
        return AppRoutes.login;
      }

      if (authStatus == AuthStatus.authenticated && isGoingToLogin) {
        return AppRoutes.chat;
      }

      return null;
    },
    refreshListenable: GoRouterRefreshStream(ref),
  );
});

/// Bridges Riverpod's state changes into something go_router's
/// `refreshListenable` can subscribe to, so a sign-out or sign-in
/// immediately re-runs the redirect logic above without the user
/// needing to manually navigate.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Ref ref) {
    ref.listen(authControllerProvider, (_, __) => notifyListeners());
  }
}
