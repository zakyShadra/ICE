import 'package:dio/dio.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/storage/secure_token_storage.dart';
import '../domain/auth_session.dart';

/// AuthRepository — talks directly to Supabase Auth's REST endpoints
/// (GoTrue), NOT to the ICE backend. Document 3, Section 5.2: "Supabase
/// Auth issues and owns identity; the backend only verifies." The
/// backend has no sign-in endpoint of its own, deliberately — this
/// repository is the one place in the mobile app that knows Supabase's
/// auth REST shape.
class AuthRepository {
  AuthRepository({required SecureTokenStorage tokenStorage, Dio? dio})
      : _tokenStorage = tokenStorage,
        _dio = dio ??
            Dio(BaseOptions(
              baseUrl: '${Env.supabaseUrl}/auth/v1',
              headers: {'apikey': Env.supabaseAnonKey, 'content-type': 'application/json'},
            ));

  final SecureTokenStorage _tokenStorage;
  final Dio _dio;

  Future<AuthSession> signInWithPassword({required String email, required String password}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/token?grant_type=password',
        data: {'email': email, 'password': password},
      );

      final data = response.data!;
      final user = data['user'] as Map<String, dynamic>;

      final session = AuthSession(
        userId: user['id'] as String,
        email: user['email'] as String,
        accessToken: data['access_token'] as String,
        refreshToken: data['refresh_token'] as String,
      );

      await _tokenStorage.saveSession(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );

      return session;
    } on DioException catch (error) {
      if (error.response?.statusCode == 400) {
        throw const ApiException(
          code: 'INVALID_CREDENTIALS',
          message: "That email and password don't match an ICE account.",
          statusCode: 400,
        );
      }
      throw ApiException.network();
    }
  }

  /// Attempts to restore a session from previously stored tokens on
  /// app launch (Splash screen's job — see splash_screen.dart). Returns
  /// null rather than throwing if there's nothing to restore, since
  /// "not logged in yet" is an expected state, not an error.
  Future<AuthSession?> restoreSession() async {
    final refreshToken = await _tokenStorage.readRefreshToken();
    if (refreshToken == null) {
      return null;
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/token?grant_type=refresh_token',
        data: {'refresh_token': refreshToken},
      );

      final data = response.data!;
      final user = data['user'] as Map<String, dynamic>;

      final session = AuthSession(
        userId: user['id'] as String,
        email: user['email'] as String,
        accessToken: data['access_token'] as String,
        refreshToken: data['refresh_token'] as String,
      );

      await _tokenStorage.saveSession(
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      );

      return session;
    } on DioException {
      // Refresh token expired or revoked — treat as "not signed in"
      // rather than surfacing an error on a splash screen the user
      // never asked anything of.
      await _tokenStorage.clear();
      return null;
    }
  }

  Future<void> signOut() async {
    await _tokenStorage.clear();
  }
}
