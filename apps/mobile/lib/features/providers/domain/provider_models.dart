/// Mirrors the backend's ModelMetadata / ProviderHealth shapes
/// (packages/types, Phase 4/4.5). Hand-maintained against real JSON,
/// same pattern as every other feature's domain models in this app —
/// no shared codegen with @ice/types yet (packages/sdk is future work).

class ProviderSummary {
  const ProviderSummary({required this.id, required this.available});

  final String id;
  final bool available;

  factory ProviderSummary.fromJson(Map<String, dynamic> json) {
    return ProviderSummary(id: json['id'] as String, available: json['available'] as bool);
  }
}

/// Matches Phase 4.5's exact status vocabulary:
/// available | unavailable | auth_failed | timeout | rate_limited
class ProviderHealth {
  const ProviderHealth({
    required this.providerId,
    required this.configured,
    required this.status,
    required this.checkedAt,
    this.detail,
  });

  final String providerId;
  final bool configured;
  final String status;
  final DateTime checkedAt;
  final String? detail;

  bool get isAvailable => status == 'available';

  factory ProviderHealth.fromJson(Map<String, dynamic> json) {
    return ProviderHealth(
      providerId: json['providerId'] as String,
      configured: json['configured'] as bool,
      status: json['status'] as String,
      checkedAt: DateTime.parse(json['checkedAt'] as String),
      detail: json['detail'] as String?,
    );
  }
}

class ModelInfo {
  const ModelInfo({
    required this.provider,
    required this.modelName,
    required this.contextWindow,
    required this.supportsStreaming,
    required this.supportsVision,
    required this.supportsToolCalling,
    required this.supportsEmbeddings,
  });

  final String provider;
  final String modelName;
  final int contextWindow;
  final bool supportsStreaming;
  final bool supportsVision;
  final bool supportsToolCalling;
  final bool supportsEmbeddings;

  factory ModelInfo.fromJson(Map<String, dynamic> json) {
    return ModelInfo(
      provider: json['provider'] as String,
      modelName: json['modelName'] as String,
      contextWindow: json['contextWindow'] as int,
      supportsStreaming: json['supportsStreaming'] as bool,
      supportsVision: json['supportsVision'] as bool,
      supportsToolCalling: json['supportsToolCalling'] as bool,
      supportsEmbeddings: json['supportsEmbeddings'] as bool,
    );
  }
}
