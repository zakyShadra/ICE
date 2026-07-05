import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/network/api_client.dart';
import '../../core/storage/secure_token_storage.dart';

/// Core infrastructure providers — the DI composition root for the
/// Flutter app (Document 2, Section 8.2: "Riverpod providers as the DI
/// mechanism"). Feature-level providers depend on these, never
/// construct their own ApiClient/SecureTokenStorage directly — this is
/// what keeps the data layer swappable/mockable exactly like Core's DI
/// on the backend (Document 2, Section 6.3).

final secureTokenStorageProvider = Provider<SecureTokenStorage>((ref) {
  return SecureTokenStorage();
});

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(tokenStorage: ref.watch(secureTokenStorageProvider));
});

/// App-wide theme mode (Document 2, Section 8.2: "Dark / Light Mode").
/// Defaults to following the system setting — an explicit user choice
/// overrides it and is expected to be persisted via user_settings once
/// Settings screen writes through to the backend (Document 3, Section 2.2).
final themeModeProvider = StateProvider<ThemeMode>((ref) => ThemeMode.system);
