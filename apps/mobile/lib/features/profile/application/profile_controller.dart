import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/di/providers.dart';
import '../../../core/network/api_exception.dart';
import '../data/profile_repository.dart';
import '../domain/profile_model.dart';

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(ref.watch(apiClientProvider));
});

class ProfileState {
  const ProfileState({this.profile, this.isLoading = false, this.isSaving = false, this.errorMessage});

  final UserProfile? profile;
  final bool isLoading;
  final bool isSaving;
  final String? errorMessage;

  ProfileState copyWith({UserProfile? profile, bool? isLoading, bool? isSaving, String? errorMessage}) {
    return ProfileState(
      profile: profile ?? this.profile,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: errorMessage,
    );
  }
}

class ProfileController extends StateNotifier<ProfileState> {
  ProfileController(this._repository) : super(const ProfileState());

  final ProfileRepository _repository;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final profile = await _repository.getProfile();
      state = state.copyWith(profile: profile, isLoading: false);
    } on ApiException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
    }
  }

  Future<bool> updateDisplayName(String displayName) async {
    state = state.copyWith(isSaving: true, errorMessage: null);
    try {
      final profile = await _repository.updateDisplayName(displayName);
      state = state.copyWith(profile: profile, isSaving: false);
      return true;
    } on ApiException catch (error) {
      state = state.copyWith(isSaving: false, errorMessage: error.message);
      return false;
    }
  }
}

final profileControllerProvider = StateNotifierProvider<ProfileController, ProfileState>((ref) {
  return ProfileController(ref.watch(profileRepositoryProvider));
});
