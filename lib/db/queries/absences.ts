import mongoose from 'mongoose';
import { LeaveRecord } from '@/lib/db/schemas/leave-record';

export class AbsencesDbQueries {
  static buildFilter(args: {
    startDate: string;
    endDate: string;
    employeeIds: string[];
    status?: string;
    leaveType?: string;
  }) {
    const rangeStart = new Date(args.startDate);
    const rangeEnd = new Date(args.endDate);
    return {
      ...(args.employeeIds.length > 0 && {
        employeeId: { $in: args.employeeIds.map((id) => new mongoose.Types.ObjectId(id)) },
      }),
      $or: [
        { startDate: { $gte: rangeStart, $lte: rangeEnd } },
        { endDate: { $gte: rangeStart, $lte: rangeEnd } },
        { startDate: { $lte: rangeStart }, endDate: { $gte: rangeEnd } },
      ],
      ...(args.status && { status: args.status }),
      ...(args.leaveType && { leaveType: args.leaveType }),
    } as Record<string, unknown>;
  }

  static async count(filter: Record<string, unknown>) {
    return LeaveRecord.countDocuments(filter);
  }

  static async listLean(args: { filter: Record<string, unknown>; limit: number; offset: number }) {
    return LeaveRecord.find(args.filter)
      .sort({ startDate: -1 })
      .skip(args.offset)
      .limit(args.limit)
      .populate({ path: 'employeeId', select: 'name pin' })
      .populate({ path: 'approvedBy', select: 'name' })
      .populate({ path: 'deniedBy', select: 'name' })
      .lean();
  }
}

