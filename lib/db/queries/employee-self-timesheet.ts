import { DailyShift } from '@/lib/db/schemas/daily-shift';
import { Employee } from '@/lib/db/schemas/employee';

export class EmployeeSelfTimesheetDbQueries {
  static async findEmployeeByIdLean(employeeId: string) {
    return Employee.findById(employeeId).lean();
  }

  static async findShiftsByPinAndDateRangeLean(args: { pin: string; start: Date; end: Date }) {
    return DailyShift.find({
      pin: args.pin,
      date: { $gte: args.start, $lte: args.end },
    }).lean();
  }

  static async findShiftByPinAndDateLean(args: { pin: string; date: Date }) {
    return DailyShift.findOne({ pin: args.pin, date: args.date }).lean();
  }
}

