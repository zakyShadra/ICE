import '../../../core/network/api_client.dart';
import '../domain/profile_model.dart';

/// Calls the real `GET /v1/profile` / `PATCH /v1/profile` endpoints
/// built in Phase 3 Part A.
class ProfileRepository {
  ProfileRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<UserProfile> getProfile() async {
    final response = await _apiClient.get('/v1/profile');
    return UserProfile.fromJson(response['profile'] as Map<String, dynamic>);
  }

  Future<UserProfile> updateDisplayName(String displayName) async {
    final response = await _apiClient.patch('/v1/profile', body: {'displayName': displayName});
    return UserProfile.fromJson(response['profile'] as Map<String, dynamic>);
  }
}
