import '../../../core/network/api_client.dart';
import '../domain/provider_models.dart';

/// ProviderRepository — calls the real Phase 4.5 backend endpoints.
/// Service-layer only, per this phase's explicit instruction not to
/// redesign the UI: SettingsScreen doesn't consume this yet (it still
/// shows the honest "not yet connected" state added in Phase 2 Part B),
/// but the data layer it will eventually call is real today.
class ProviderRepository {
  ProviderRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<ProviderSummary>> listProviders() async {
    final response = await _apiClient.get('/v1/providers');
    final providers = response['providers'] as List<dynamic>;
    return providers.map((p) => ProviderSummary.fromJson(p as Map<String, dynamic>)).toList();
  }

  Future<List<ProviderHealth>> getStatus() async {
    final response = await _apiClient.get('/v1/providers/status');
    final status = response['status'] as List<dynamic>;
    return status.map((s) => ProviderHealth.fromJson(s as Map<String, dynamic>)).toList();
  }

  Future<List<ModelInfo>> listModels() async {
    final response = await _apiClient.get('/v1/providers/models');
    final models = response['models'] as List<dynamic>;
    return models.map((m) => ModelInfo.fromJson(m as Map<String, dynamic>)).toList();
  }

  Future<ProviderHealth> testProvider(String providerId) async {
    final response = await _apiClient.post('/v1/providers/test', body: {'providerId': providerId});
    return ProviderHealth.fromJson(response['result'] as Map<String, dynamic>);
  }
}
