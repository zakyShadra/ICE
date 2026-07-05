import type { ProviderHealth, ProviderHealthStatus, ProviderId } from '@ice/types';

/**
 * classifyHealthResponse — Phase 4.5: shared status classification so
 * all five adapters report the same vocabulary (available/unavailable/
 * auth_failed/timeout/rate_limited) from the same rules, rather than
 * each adapter inventing its own interpretation of "what counts as a
 * timeout." Used by every adapter's `healthCheck()`.
 */
export function classifyHealthResponse(params: {
  providerId: ProviderId;
  configured: boolean;
  response?: Response;
  error?: unknown;
}): ProviderHealth {
  const checkedAt = new Date().toISOString();

  if (!params.configured) {
    return { providerId: params.providerId, configured: false, status: 'unavailable', reachable: null, checkedAt };
  }

  if (params.error) {
    const isTimeout =
      params.error instanceof DOMException && params.error.name === 'TimeoutError';
    return {
      providerId: params.providerId,
      configured: true,
      status: isTimeout ? 'timeout' : 'unavailable',
      reachable: false,
      checkedAt,
      detail: params.error instanceof Error ? params.error.message : String(params.error),
    };
  }

  const response = params.response!;

  let status: ProviderHealthStatus;
  if (response.ok) {
    status = 'available';
  } else if (response.status === 401 || response.status === 403) {
    status = 'auth_failed';
  } else if (response.status === 429) {
    status = 'rate_limited';
  } else if (response.status === 408) {
    status = 'timeout';
  } else {
    status = 'unavailable';
  }

  return {
    providerId: params.providerId,
    configured: true,
    status,
    reachable: response.ok,
    checkedAt,
    detail: response.ok ? undefined : `HTTP ${response.status}`,
  };
}
