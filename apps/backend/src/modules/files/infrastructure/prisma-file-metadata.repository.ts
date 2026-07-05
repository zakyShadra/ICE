import type { PrismaClient } from '@prisma/client';
import { FileNotFoundError, type FileAsset, type IFileMetadataRepository } from '../domain/file.types.js';

export class PrismaFileMetadataRepository implements IFileMetadataRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(asset: Omit<FileAsset, 'id' | 'createdAt'>): Promise<FileAsset> {
    const record = await this.prisma.fileAsset.create({
      data: {
        userId: asset.userId,
        projectId: asset.projectId ?? undefined,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        storagePath: asset.storagePath,
      },
    });
    return this.toDomain(record);
  }

  async findById(fileId: string, userId: string): Promise<FileAsset | null> {
    const record = await this.prisma.fileAsset.findFirst({ where: { id: fileId, userId } });
    return record ? this.toDomain(record) : null;
  }

  async delete(fileId: string, userId: string): Promise<void> {
    const result = await this.prisma.fileAsset.deleteMany({ where: { id: fileId, userId } });
    if (result.count === 0) throw new FileNotFoundError(fileId);
  }

  private toDomain(record: {
    id: string;
    userId: string;
    projectId: string | null;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    createdAt: Date;
  }): FileAsset {
    return {
      id: record.id,
      userId: record.userId,
      projectId: record.projectId,
      fileName: record.fileName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      storagePath: record.storagePath,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
