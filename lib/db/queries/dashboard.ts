import { DailyShift } from '@/lib/db/schemas/daily-shift';
import { Employee } from '@/lib/db/schemas/employee';

export class DashboardDbQueries {
  static async findEmployeesLean(filter: Record<string, unknown>) {
    return Employee.find(filter).lean();
  }

  static async findShiftsLean(filter: Record<string, unknown>) {
    return DailyShift.find(filter).lean();
  }

  static async distinctPins(filter: Record<string, unknown>) {
    return DailyShift.distinct('pin', filter);
  }

  static async countShifts(filter: Record<string, unknown>) {
    return DailyShift.countDocuments(filter);
  }

  static async aggregateShifts<T = unknown>(pipeline: any[]) {
    return DailyShift.aggregate<T>(pipeline);
  }
}

