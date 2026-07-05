export interface FileAsset {
  id: string;
  userId: string;
  projectId: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  createdAt: string;
}

export interface UploadFileInput {
  userId: string;
  projectId?: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export class FileNotFoundError extends Error {
  readonly code = 'FILE_NOT_FOUND';
  constructor(fileId: string) {
    super(`File not found: ${fileId}`);
  }
}

/**
 * IFileMetadataRepository — Document 3-style Repository boundary
 * applied to the new FileAsset table. Only tracks metadata; actual
 * bytes live in object storage (IObjectStorage below).
 */
export interface IFileMetadataRepository {
  create(asset: Omit<FileAsset, 'id' | 'createdAt'>): Promise<FileAsset>;
  findById(fileId: string, userId: string): Promise<FileAsset | null>;
  delete(fileId: string, userId: string): Promise<void>;
}

/**
 * IObjectStorage — the boundary between the Files module and Supabase
 * Storage, mirroring how IIdentityProvider isolates Supabase Auth
 * (Document 3, Section 5). If object storage ever moved off Supabase,
 * only the infrastructure implementation changes.
 */
export interface IObjectStorage {
  upload(path: string, buffer: Buffer, mimeType: string): Promise<void>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
}
