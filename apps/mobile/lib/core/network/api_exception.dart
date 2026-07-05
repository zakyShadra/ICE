/// Normalized error shape for anything the API client throws.
///
/// Mirrors the backend's centralized error shape (Document 2, Section
/// 7.4: `{ error: { code, message } }`) so a UI-layer catch block can
/// switch on `code` the same way regardless of whether the failure was
/// a domain error from Core or a transport-level failure (timeout, no
/// connectivity).
class ApiException implements Exception {
  const ApiException({required this.code, required this.message, this.statusCode});

  final String code;
  final String message;
  final int? statusCode;

  factory ApiException.network() => const ApiException(
        code: 'NETWORK_ERROR',
        message: "Couldn't reach ICE. Check your connection and try again.",
      );

  factory ApiException.unauthenticated() => const ApiException(
        code: 'UNAUTHENTICATED',
        message: 'Your session has expired. Please sign in again.',
        statusCode: 401,
      );

  factory ApiException.unknown([String? detail]) => ApiException(
        code: 'UNKNOWN',
        message: detail ?? 'Something went wrong on our end.',
      );

  @override
  String toString() => 'ApiException($code): $message';
}
