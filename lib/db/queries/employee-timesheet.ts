import { DailyShift } from '@/lib/db/schemas/daily-shift';
import { Employee } from '@/lib/db/schemas/employee';

export class EmployeeTimesheetDbQueries {
  static async findEmployeeLean(filter: Record<string, unknown>) {
    return Employee.findOne(filter).lean();
  }

  static async findShiftsByPinLean(args: {
    tenantId: unknown;
    pin: string;
    startDate?: Date | null;
    endDate?: Date | null;
    limit?: number;
    offset?: number;
    sortBy?: 'date' | 'totalWorkingHours' | 'totalBreakMinutes';
    order?: 'asc' | 'desc';
  }) {
    const {
      tenantId,
      pin,
      startDate = null,
      endDate = null,
      limit = 50,
      offset = 0,
      sortBy = 'date',
      order = 'desc',
    } = args;

    const q: Record<string, any> = { tenantId, pin };
    if (startDate || endDate) {
      q.date = {};
      if (startDate) q.date.$gte = startDate;
      if (endDate) q.date.$lte = endDate;
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: order === 'asc' ? 1 : -1 };
    return DailyShift.find(q).sort(sort).skip(offset).limit(limit).lean();
  }

  static async countShiftsByPin(args: {
    tenantId: unknown;
    pin: string;
    startDate?: Date | null;
    endDate?: Date | null;
  }) {
    const { tenantId, pin, startDate = null, endDate = null } = args;
    const q: Record<string, any> = { tenantId, pin };
    if (startDate || endDate) {
      q.date = {};
      if (startDate) q.date.$gte = startDate;
      if (endDate) q.date.$lte = endDate;
    }
    return DailyShift.countDocuments(q);
  }

  static async findShiftByPinAndDate(args: { tenantId: unknown; pin: string; date: string }) {
    const { tenantId, pin, date } = args;
    return DailyShift.findOne({ tenantId, pin, date });
  }
}

