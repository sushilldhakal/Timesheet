import mongoose from 'mongoose';
import { Location } from '@/lib/db';

export class LocationsDbQueries {
  static async listLean(args: {
    tenantId: string;
    search?: string;
    isActive?: boolean;
  }) {
    const filter: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(args.tenantId),
    };
    if (typeof args.isActive === 'boolean') filter.isActive = args.isActive;
    if (args.search) filter.name = { $regex: args.search, $options: 'i' };
    return Location.find(filter).sort({ order: 1, name: 1 }).lean();
  }

  static async findByIdLean(id: string) {
    return Location.findById(id).lean();
  }

  static async findById(id: string) {
    return Location.findById(id);
  }

  static async findDuplicateByNameLean(args: {
    tenantId: string;
    name: string;
    excludeId?: string;
  }) {
    return Location.findOne({
      tenantId: new mongoose.Types.ObjectId(args.tenantId),
      ...(args.excludeId && { _id: { $ne: new mongoose.Types.ObjectId(args.excludeId) } }),
      name: { $regex: new RegExp(`^${args.name.trim()}$`, 'i') },
    }).lean();
  }

  static async create(args: Record<string, unknown>) {
    return Location.create(args);
  }
}

