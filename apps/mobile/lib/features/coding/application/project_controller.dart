import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../app/di/providers.dart';
import '../../../core/network/api_exception.dart';
import '../data/project_repository.dart';
import '../domain/project_model.dart';

final projectRepositoryProvider = Provider<ProjectRepository>((ref) {
  return ProjectRepository(ref.watch(apiClientProvider));
});

class ProjectListState {
  const ProjectListState({this.projects = const [], this.isLoading = false, this.errorMessage});

  final List<Project> projects;
  final bool isLoading;
  final String? errorMessage;

  ProjectListState copyWith({List<Project>? projects, bool? isLoading, String? errorMessage}) {
    return ProjectListState(
      projects: projects ?? this.projects,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class ProjectController extends StateNotifier<ProjectListState> {
  ProjectController(this._repository) : super(const ProjectListState());

  final ProjectRepository _repository;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final projects = await _repository.list();
      state = state.copyWith(projects: projects, isLoading: false);
    } on ApiException catch (error) {
      state = state.copyWith(isLoading: false, errorMessage: error.message);
    }
  }

  Future<void> create(String name) async {
    try {
      final project = await _repository.create(name);
      state = state.copyWith(projects: [project, ...state.projects]);
    } on ApiException catch (error) {
      state = state.copyWith(errorMessage: error.message);
    }
  }

  Future<void> delete(String projectId) async {
    final previous = state.projects;
    state = state.copyWith(projects: previous.where((p) => p.id != projectId).toList());
    try {
      await _repository.delete(projectId);
    } on ApiException catch (error) {
      // Roll back optimistic removal on failure — never leave the UI
      // claiming a delete succeeded when the backend rejected it.
      state = state.copyWith(projects: previous, errorMessage: error.message);
    }
  }
}

final projectControllerProvider = StateNotifierProvider<ProjectController, ProjectListState>((ref) {
  return ProjectController(ref.watch(projectRepositoryProvider));
});
