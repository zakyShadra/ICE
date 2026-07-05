import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/di/providers.dart';
import '../../../core/network/api_exception.dart';
import '../data/provider_repository.dart';
import '../domain/provider_models.dart';

final providerRepositoryProvider = Provider<ProviderRepository>((ref) {
  return ProviderRepository(ref.watch(apiClientProvider));
});

/// State shape prepared for the eventual Settings screen — Phase 4.5's
/// explicit ask ("Prepare Flutter so the Settings screen can later
/// display: Connected Providers, Available Models, Default Provider,
/// Auto Mode"). `defaultProvider`/`autoMode` are left null/true here
/// because the backend's user_settings-backed defaults live behind
/// `/v1/settings` (Phase 3 Part C) — this controller only owns
/// provider/model data, not routing preference, which is a separate
/// concern (SettingsController, not yet built) once the UI is wired up.
class ProviderManagementState {
  const ProviderManagementState({
    this.providers = const [],
    this.health = const [],
    this.models = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  final List<ProviderSummary> providers;
  final List<ProviderHealth> health;
  final List<ModelInfo> models;
  final bool isLoading;
  final String? errorMessage;

  ProviderManagementState copyWith({
    List<ProviderSummary>? providers,
    List<ProviderHealth>? health,
    List<ModelInfo>? models,
    bool? isLoading,
    String? errorMessage,
  }) {
    return ProviderManagementState(
      providers: providers ?? this.providers,
      health: health ?? this.health,
      models: models ?? this.models,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class ProviderController extends StateNotifier<ProviderManagementState> {
  ProviderController(this._repository) : super(const ProviderManagementState());

  final ProviderRepository _repository;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final results = await Future.wait([
        _repository.listProviders(),
        _repository.getStatus(),
        _repository.listModels(),
      ]);
      state = state.copyWith(
        providers: results[0] as List<ProviderSummary>,
        health: results[1] as List<ProviderHealth>,
        models: results[2] as List<ModelInfo>,
        isLoading: false,
      );
    } on ApiException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
    }
  }

  Future<ProviderHealth?> test(String providerId) async {
    try {
      final result = await _repository.testProvider(providerId);
      final updatedHealth = [
        ...state.health.where((h) => h.providerId != providerId),
        result,
      ];
      state = state.copyWith(health: updatedHealth);
      return result;
    } on ApiException catch (error) {
      state = state.copyWith(errorMessage: error.message);
      return null;
    }
  }
}

final providerControllerProvider =
    StateNotifierProvider<ProviderController, ProviderManagementState>((ref) {
  return ProviderController(ref.watch(providerRepositoryProvider));
});
