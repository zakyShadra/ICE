import 'package:dio/dio.dart';
import '../storage/secure_token_storage.dart';

/// Attaches the current access token to every outgoing request.
///
/// Deliberately does nothing else — token *refresh* is the Supabase
/// SDK's job client-side (Document 3, Section 5.2: "refresh token flow
/// handled client-side... not proxied through the backend"). This
/// interceptor only ever reads whatever token is currently stored.
class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._tokenStorage);

  final SecureTokenStorage _tokenStorage;

  @override
  Future<void> onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _tokenStorage.readAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}
