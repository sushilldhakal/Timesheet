import MediaFile, { IMediaFile } from "../schemas/media-file";
import mongoose from "mongoose";

export class MediaFileRepo {
  static async findById(id: string | mongoose.Types.ObjectId): Promise<IMediaFile | null> {
    return MediaFile.findById(id).lean() as unknown as IMediaFile | null;
  }

  static async findByR2Key(r2Key: string): Promise<IMediaFile | null> {
    return MediaFile.findOne({ r2Key }).lean() as unknown as IMediaFile | null;
  }

  static async findByOrgId(
    orgId: string | mongoose.Types.ObjectId,
    options?: { limit?: number; skip?: number; sort?: any }
  ): Promise<IMediaFile[]> {
    let query = MediaFile.find({ orgId });

    if (options?.sort) query = query.sort(options.sort);
    if (options?.skip) query = query.skip(options.skip);
    if (options?.limit) query = query.limit(options.limit);

    return query.lean() as unknown as IMediaFile[];
  }

  static async findBeforeDate(orgId: string | mongoose.Types.ObjectId, beforeDate: Date): Promise<IMediaFile[]> {
    return MediaFile.find({ orgId, createdAt: { $lt: beforeDate } }).lean() as unknown as IMediaFile[];
  }

  static async countByOrgId(orgId: string | mongoose.Types.ObjectId): Promise<number> {
    return MediaFile.countDocuments({ orgId });
  }

  static async create(data: Partial<IMediaFile>): Promise<IMediaFile> {
    const file = new MediaFile(data);
    return file.save();
  }

  static async deleteById(id: string | mongoose.Types.ObjectId): Promise<void> {
    await MediaFile.deleteOne({ _id: id });
  }

  static async deleteByR2Key(r2Key: string): Promise<void> {
    await MediaFile.deleteOne({ r2Key });
  }

  static async deleteMany(filter: any): Promise<number> {
    const result = await MediaFile.deleteMany(filter);
    return result.deletedCount || 0;
  }
}
