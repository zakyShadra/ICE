import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Typography scale — deliberately small and restrained (Document 2,
/// Section 8.2's "Calm Intelligence": clean, minimal, distraction-free).
/// One scale, reused by both themes with color swapped per-brightness.
class AppTypography {
  const AppTypography._();

  static TextTheme build(Brightness brightness) {
    final primary = brightness == Brightness.light
        ? AppColors.lightTextPrimary
        : AppColors.darkTextPrimary;
    final secondary = brightness == Brightness.light
        ? AppColors.lightTextSecondary
        : AppColors.darkTextSecondary;

    return TextTheme(
      headlineMedium: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w600,
        color: primary,
        height: 1.25,
      ),
      titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: primary),
      titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: primary),
      bodyLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w400, color: primary, height: 1.4),
      bodyMedium: TextStyle(fontSize: 14, fontWeight: FontWeight.w400, color: primary, height: 1.4),
      bodySmall: TextStyle(fontSize: 13, fontWeight: FontWeight.w400, color: secondary),
      labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: primary),
    );
  }
}
