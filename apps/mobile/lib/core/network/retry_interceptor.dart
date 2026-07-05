import 'dart:async';
import 'package:dio/dio.dart';

/// Retry strategy — Document 1's UX philosophy (Section 7.2) says ICE
/// should never pretend confidence it doesn't have, and that includes
/// network calls: a single dropped packet shouldn't surface as a hard
/// failure to the user. Retries only idempotent, transient failures —
/// never retries a request that already reached the server and failed
/// there (4xx), since re-sending a failed POST could double-submit.
class RetryInterceptor extends Interceptor {
  RetryInterceptor(this._dio, {this.maxRetries = 2, this.baseDelay = const Duration(milliseconds: 400)});

  final Dio _dio;
  final int maxRetries;
  final Duration baseDelay;

  static const _retryCountKey = 'ice_retry_count';

  @override
  Future<void> onError(DioException err, ErrorInterceptorHandler handler) async {
    final isTransient = err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError ||
        (err.response?.statusCode ?? 0) >= 500;

    final currentAttempt = (err.requestOptions.extra[_retryCountKey] as int?) ?? 0;

    if (!isTransient || currentAttempt >= maxRetries) {
      handler.next(err);
      return;
    }

    final nextAttempt = currentAttempt + 1;
    final delay = baseDelay * nextAttempt; // linear backoff, deliberately simple for V1

    await Future<void>.delayed(delay);

    try {
      final options = err.requestOptions;
      options.extra[_retryCountKey] = nextAttempt;
      final response = await _dio.fetch<dynamic>(options);
      handler.resolve(response);
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }
}
