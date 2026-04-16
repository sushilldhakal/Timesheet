import mongoose from 'mongoose';
import Award from '@/lib/db/schemas/award';
import { Employee } from '@/lib/db/schemas/employee';

export class AwardsDbQueries {
  static async count(query: Record<string, unknown>) {
    return Award.countDocuments(query);
  }

  static async listLean(args: { query: Record<string, unknown>; page: number; limit: number }) {
    return Award.find(args.query)
      .sort({ name: 1 })
      .skip((args.page - 1) * args.limit)
      .limit(args.limit)
      .lean();
  }

  static async create(body: any) {
    const award = new (Award as any)(body);
    await award.save();
    return award;
  }

  static async findByIdLean(id: string) {
    return Award.findById(id).lean();
  }

  static async findByIdAndUpdate(id: string, body: any) {
    return Award.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  }

  static async countAssignedEmployees(awardId: string) {
    return Employee.countDocuments({ awardId: new mongoose.Types.ObjectId(awardId) });
  }

  static async deleteById(id: string) {
    return Award.findByIdAndDelete(id);
  }
}

