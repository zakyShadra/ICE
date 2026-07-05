/// Environment configuration — Document 2, Section 8.2 ("Configuration").
///
/// Values are compiled in via `--dart-define`, never hardcoded, so the
/// same codebase targets local/staging/production without code changes.
/// Mirrors the backend's `@ice/config` philosophy (Document 2, Section
/// 7.5): declared once, in one place, with an explicit failure if a
/// required value is missing.
class Env {
  const Env._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  static const String supabaseUrl = String.fromEnvironment('SUPABASE_URL');

  static const String supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  /// Fails loudly at startup rather than letting a misconfigured build
  /// silently hit the wrong backend or fail every network call with a
  /// confusing error deep in the widget tree.
  static void assertConfigured() {
    final missing = <String>[
      if (supabaseUrl.isEmpty) 'SUPABASE_URL',
      if (supabaseAnonKey.isEmpty) 'SUPABASE_ANON_KEY',
    ];

    if (missing.isNotEmpty) {
      throw StateError(
        'Missing required --dart-define values: ${missing.join(', ')}.\n'
        'Run with e.g.:\n'
        '  flutter run --dart-define=SUPABASE_URL=... --dart-define=SUPABASE_ANON_KEY=... --dart-define=API_BASE_URL=...',
      );
    }
  }
}
