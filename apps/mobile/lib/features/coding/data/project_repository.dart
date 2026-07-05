import '../../../core/network/api_client.dart';
import '../domain/project_model.dart';

/// Calls the real `/v1/projects` CRUD endpoints (Phase 3 Part B).
class ProjectRepository {
  ProjectRepository(this._apiClient);

  final ApiClient _apiClient;

  Future<List<Project>> list() async {
    final response = await _apiClient.get('/v1/projects');
    final projects = response['projects'] as List<dynamic>;
    return projects.map((p) => Project.fromJson(p as Map<String, dynamic>)).toList();
  }

  Future<Project> create(String name) async {
    final response = await _apiClient.post('/v1/projects', body: {'name': name});
    return Project.fromJson(response['project'] as Map<String, dynamic>);
  }

  Future<void> delete(String projectId) => _apiClient.delete('/v1/projects/$projectId');
}
