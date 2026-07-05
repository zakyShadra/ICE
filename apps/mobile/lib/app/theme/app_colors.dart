import 'package:flutter/material.dart';

/// ICE's color tokens — Document 1, Section 7's "calm confidence" UX
/// philosophy translated into a palette: muted, low-saturation, no
/// attention-grabbing brights. This is the single source of color truth
/// consumed by both light and dark themes below (and, once extracted,
/// by packages/ui for Desktop — Document 2, Section 8.2).
class AppColors {
  const AppColors._();

  // Brand
  static const Color iceBlue = Color(0xFF4C6EF5);
  static const Color iceBlueMuted = Color(0xFF8DA4F1);

  // Light theme surfaces
  static const Color lightBackground = Color(0xFFFAFAFB);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFE5E7EB);
  static const Color lightTextPrimary = Color(0xFF1A1B23);
  static const Color lightTextSecondary = Color(0xFF6B7280);

  // Dark theme surfaces
  static const Color darkBackground = Color(0xFF111218);
  static const Color darkSurface = Color(0xFF1B1D26);
  static const Color darkBorder = Color(0xFF2C2E38);
  static const Color darkTextPrimary = Color(0xFFF2F2F5);
  static const Color darkTextSecondary = Color(0xFF9A9CA8);

  // Semantic
  static const Color success = Color(0xFF3EBD79);
  static const Color warning = Color(0xFFE0A93A);
  static const Color danger = Color(0xFFE0524A);
}
