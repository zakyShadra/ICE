import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/app.dart';
import 'core/config/env.dart';

/// Entry point — Document 2, Section 8.2. Deliberately thin: assert
/// configuration is present, then hand off to IceApp under a
/// ProviderScope. No business logic lives here.
void main() {
  Env.assertConfigured();

  runApp(
    const ProviderScope(
      child: IceApp(),
    ),
  );
}
