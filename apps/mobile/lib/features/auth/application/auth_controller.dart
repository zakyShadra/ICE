import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/di/providers.dart';
import '../../../core/network/api_exception.dart';
import '../data/auth_repository.dart';
import '../domain/auth_session.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(tokenStorage: ref.watch(secureTokenStorageProvider));
});

/// Auth state — one of three real states the router (app/router.dart)
/// branches on. Deliberately a sealed-ish union via enum + nullable
/// session rather than three separate booleans, so "loading AND
/// authenticated" can't accidentally become representable.
enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  const AuthState({required this.status, this.session, this.errorMessage});

  final AuthStatus status;
  final AuthSession? session;
  final String? errorMessage;

  const AuthState.unknown() : this(status: AuthStatus.unknown);

  AuthState copyWith({AuthStatus? status, AuthSession? session, String? errorMessage}) {
    return AuthState(
      status: status ?? this.status,
      session: session ?? this.session,
      errorMessage: errorMessage,
    );
  }
}

/// AuthController — the single source of truth for "is anyone signed
/// in." Splash reads it to decide where to route; Login writes to it;
/// Settings' sign-out writes to it. Nothing else touches AuthRepository
/// directly (Document 2, Section 8.2's DI philosophy applied to Flutter).
class AuthController extends StateNotifier<AuthState> {
  AuthController(this._repository) : super(const AuthState.unknown());

  final AuthRepository _repository;

  Future<void> restoreSession() async {
    final session = await _repository.restoreSession();
    state = session != null
        ? state.copyWith(status: AuthStatus.authenticated, session: session)
        : state.copyWith(status: AuthStatus.unauthenticated);
  }

  Future<bool> signIn({required String email, required String password}) async {
    try {
      final session = await _repository.signInWithPassword(email: email, password: password);
      state = state.copyWith(status: AuthStatus.authenticated, session: session, errorMessage: null);
      return true;
    } on ApiException catch (error) {
      state = state.copyWith(status: AuthStatus.unauthenticated, errorMessage: error.message);
      return false;
    }
  }

  Future<void> signOut() async {
    await _repository.signOut();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref.watch(authRepositoryProvider));
});
