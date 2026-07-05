import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_typography.dart';

/// ICE's light and dark themes.
///
/// Consumed (not redefined) by every screen — Document 2, Section 8.2:
/// "Centralized theme... consumed, not redefined... prevents the two
/// clients' look-and-feel drifting apart."
class AppTheme {
  const AppTheme._();

  static ThemeData light() {
    const brightness = Brightness.light;
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: AppColors.lightBackground,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.iceBlue,
        brightness: brightness,
        surface: AppColors.lightSurface,
      ),
      textTheme: AppTypography.build(brightness),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.lightBackground,
        foregroundColor: AppColors.lightTextPrimary,
        elevation: 0,
        centerTitle: false,
      ),
      dividerColor: AppColors.lightBorder,
      inputDecorationTheme: _inputDecorationTheme(brightness),
      elevatedButtonTheme: _elevatedButtonTheme(),
    );
  }

  static ThemeData dark() {
    const brightness = Brightness.dark;
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      scaffoldBackgroundColor: AppColors.darkBackground,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.iceBlueMuted,
        brightness: brightness,
        surface: AppColors.darkSurface,
      ),
      textTheme: AppTypography.build(brightness),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.darkBackground,
        foregroundColor: AppColors.darkTextPrimary,
        elevation: 0,
        centerTitle: false,
      ),
      dividerColor: AppColors.darkBorder,
      inputDecorationTheme: _inputDecorationTheme(brightness),
      elevatedButtonTheme: _elevatedButtonTheme(),
    );
  }

  static InputDecorationTheme _inputDecorationTheme(Brightness brightness) {
    final borderColor = brightness == Brightness.light ? AppColors.lightBorder : AppColors.darkBorder;
    return InputDecorationTheme(
      filled: true,
      fillColor: brightness == Brightness.light ? AppColors.lightSurface : AppColors.darkSurface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: borderColor),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: borderColor),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: AppColors.iceBlue, width: 1.5),
      ),
    );
  }

  static ElevatedButtonThemeData _elevatedButtonTheme() {
    return ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.iceBlue,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 0,
      ),
    );
  }
}
