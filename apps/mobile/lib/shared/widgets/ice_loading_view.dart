import 'package:flutter/material.dart';

/// Shared loading layout — deliberately plain (a single centered
/// spinner), consistent with the "calm, not chatty" UI philosophy
/// (Document 2, Section 8.2) rather than a busy skeleton animation on
/// every screen.
class IceLoadingView extends StatelessWidget {
  const IceLoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: CircularProgressIndicator());
  }
}
