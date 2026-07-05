import 'package:flutter/material.dart';

/// The one primary-action button every screen should use, so "what does
/// a confirm/submit button look like in ICE" is answered once
/// (Document 2, Section 8.2: shared design system, not per-screen
/// styling decisions).
class IcePrimaryButton extends StatelessWidget {
  const IcePrimaryButton({
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      child: isLoading
          ? const SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            )
          : Text(label),
    );
  }
}
