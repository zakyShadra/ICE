import 'package:equatable/equatable.dart';

/// The client's view of an authenticated session — Document 3, Section
/// 5: Supabase owns identity; this is just the shape the app needs to
/// know a user is signed in and who they are.
class AuthSession extends Equatable {
  const AuthSession({
    required this.userId,
    required this.email,
    required this.accessToken,
    required this.refreshToken,
  });

  final String userId;
  final String email;
  final String accessToken;
  final String refreshToken;

  @override
  List<Object?> get props => [userId, email, accessToken, refreshToken];
}
