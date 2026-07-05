import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/router.dart';
import '../../auth/application/auth_controller.dart';

/// Splash — the app's actual startup logic, not a decorative delay.
/// Attempts to restore a session from stored tokens (Document 3,
/// Section 5.2), then routes to the workspace shell or Login based on
/// the real result. This is the ONLY screen that calls
/// `restoreSession()` — everywhere else just reads the resulting state.
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    await ref.read(authControllerProvider.notifier).restoreSession();

    if (!mounted) return;

    final status = ref.read(authControllerProvider).status;

    if (status == AuthStatus.authenticated) {
      context.go(AppRoutes.chat);
    } else {
      context.go(AppRoutes.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.ac_unit_rounded, size: 48),
            SizedBox(height: 16),
            Text('ICE', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
