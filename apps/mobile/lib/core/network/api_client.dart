import 'package:dio/dio.dart';
import '../config/env.dart';
import '../storage/secure_token_storage.dart';
import 'api_exception.dart';
import 'auth_interceptor.dart';
import 'retry_interceptor.dart';

/// The single, thin HTTP client every feature's data layer depends on.
///
/// Mirrors @ice/sdk's intended role (Document 2, Section 9) even before
/// that package is extracted: one typed, centrally-configured place
/// that knows how to talk to the backend, so no feature hand-rolls its
/// own Dio instance or its own error normalization.
class ApiClient {
  ApiClient({SecureTokenStorage? tokenStorage}) : _tokenStorage = tokenStorage ?? SecureTokenStorage() {
    _dio = Dio(
      BaseOptions(
        baseUrl: Env.apiBaseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 30),
        headers: {'content-type': 'application/json'},
      ),
    );

    _dio.interceptors.add(AuthInterceptor(_tokenStorage));
    _dio.interceptors.add(RetryInterceptor(_dio));
  }

  late final Dio _dio;
  final SecureTokenStorage _tokenStorage;

  Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? body}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(path, data: body);
      return response.data ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  Future<Map<String, dynamic>> get(String path) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(path);
      return response.data ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  Future<Map<String, dynamic>> patch(String path, {Map<String, dynamic>? body}) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(path, data: body);
      return response.data ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  Future<void> delete(String path) async {
    try {
      await _dio.delete<void>(path);
    } on DioException catch (error) {
      throw _mapError(error);
    }
  }

  ApiException _mapError(DioException error) {
    if (error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout) {
      return ApiException.network();
    }

    final status = error.response?.statusCode;

    if (status == 401) {
      return ApiException.unauthenticated();
    }

    final data = error.response?.data;
    if (data is Map<String, dynamic> && data['error'] is Map<String, dynamic>) {
      final errorBody = data['error'] as Map<String, dynamic>;
      return ApiException(
        code: errorBody['code'] as String? ?? 'UNKNOWN',
        message: errorBody['message'] as String? ?? 'Something went wrong.',
        statusCode: status,
      );
    }

    return ApiException.unknown(error.message);
  }
}
