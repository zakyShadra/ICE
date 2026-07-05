import { randomUUID } from 'node:crypto';
import {
  FileNotFoundError,
  type FileAsset,
  type IFileMetadataRepository,
  type IObjectStorage,
  type UploadFileInput,
} from '../domain/file.types.js';

/**
 * FileService — Application layer. Orchestrates metadata (Postgres, via
 * IFileMetadataRepository) and bytes (Supabase Storage, via
 * IObjectStorage) as one atomic-feeling operation, even though they're
 * two separate systems — this is the one piece of real business logic
 * in the Files module: keeping them in sync, including cleaning up
 * storage if metadata creation fails, and vice versa on delete.
 */
export class FileService {
  constructor(
    private readonly metadata: IFileMetadataRepository,
    private readonly storage: IObjectStorage,
  ) {}

  async upload(input: UploadFileInput): Promise<FileAsset> {
    const storagePath = `${input.userId}/${randomUUID()}-${input.fileName}`;

    await this.storage.upload(storagePath, input.buffer, input.mimeType);

    try {
      return await this.metadata.create({
        userId: input.userId,
        projectId: input.projectId ?? null,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.buffer.byteLength,
        storagePath,
      });
    } catch (error) {
      // Metadata write failed after the bytes were already stored —
      // clean up rather than leaving an orphaned object with no
      // corresponding row (Document 1 Principle #6: user data should
      // be accounted for, not silently leaked into storage nobody can see).
      await this.storage.delete(storagePath).catch(() => undefined);
      throw error;
    }
  }

  async download(fileId: string, userId: string): Promise<{ asset: FileAsset; buffer: Buffer }> {
    const asset = await this.metadata.findById(fileId, userId);
    if (!asset) throw new FileNotFoundError(fileId);
    const buffer = await this.storage.download(asset.storagePath);
    return { asset, buffer };
  }

  async getMetadata(fileId: string, userId: string): Promise<FileAsset> {
    const asset = await this.metadata.findById(fileId, userId);
    if (!asset) throw new FileNotFoundError(fileId);
    return asset;
  }

  async delete(fileId: string, userId: string): Promise<void> {
    const asset = await this.metadata.findById(fileId, userId);
    if (!asset) throw new FileNotFoundError(fileId);
    await this.storage.delete(asset.storagePath);
    await this.metadata.delete(fileId, userId);
  }
}
