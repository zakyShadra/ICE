import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure, persistent storage for the Supabase session — Document 3,
/// Section 5.2: the backend never issues tokens, Supabase does, and the
/// client is responsible for holding onto what it's given and using the
/// Supabase SDK's own refresh flow, not a backend-proxied one.
///
/// Deliberately narrow: two keys, nothing else. Anything beyond raw
/// session persistence belongs in AuthRepository, not here.
class SecureTokenStorage {
  SecureTokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  static const _accessTokenKey = 'ice.auth.access_token';
  static const _refreshTokenKey = 'ice.auth.refresh_token';

  Future<void> saveSession({required String accessToken, required String refreshToken}) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  Future<String?> readAccessToken() => _storage.read(key: _accessTokenKey);

  Future<String?> readRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> clear() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }
}
