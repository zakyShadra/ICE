import type { IceConfig } from '@ice/config';
import type { IObjectStorage } from '../domain/file.types.js';

class ObjectStorageError extends Error {
  readonly code = 'OBJECT_STORAGE_ERROR';
  constructor(message: string) {
    super(message);
  }
}

/**
 * SupabaseObjectStorage — the ONLY file in the Files module that calls
 * Supabase Storage's REST API directly, via the service-role key (never
 * exposed to any client — Document 3, Section 5.2's service-role rule
 * applied to Storage, not just the database).
 *
 * Uses plain fetch, consistent with SupabaseIdentityProvider's approach
 * (Phase 3 Part A) — no SDK dependency needed for a handful of REST
 * calls, and it keeps this file the obvious, singular boundary.
 */
export class SupabaseObjectStorage implements IObjectStorage {
  private readonly baseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly bucket = 'ice-files';

  constructor(config: IceConfig) {
    this.baseUrl = `${config.SUPABASE_URL}/storage/v1`;
    this.serviceRoleKey = config.SUPABASE_SERVICE_ROLE_KEY;
  }

  async upload(path: string, buffer: Buffer, mimeType: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/object/${this.bucket}/${path}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.serviceRoleKey}`,
        'content-type': mimeType,
        'x-upsert': 'true',
      },
      body: buffer,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ObjectStorageError(`Upload failed (HTTP ${response.status}): ${body}`);
    }
  }

  async download(path: string): Promise<Buffer> {
    const response = await fetch(`${this.baseUrl}/object/${this.bucket}/${path}`, {
      headers: { authorization: `Bearer ${this.serviceRoleKey}` },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ObjectStorageError(`Download failed (HTTP ${response.status}): ${body}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/object/${this.bucket}/${path}`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${this.serviceRoleKey}` },
    });

    if (!response.ok && response.status !== 404) {
      const body = await response.text();
      throw new ObjectStorageError(`Delete failed (HTTP ${response.status}): ${body}`);
    }
  }
}

export { ObjectStorageError };
