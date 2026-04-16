import { DailyShift, Employee } from "@/lib/db";

export class FlagsDbQueries {
  static async listFlaggedShiftsLean(args: { start: Date; end: Date }) {
    return DailyShift.find({
      date: { $gte: args.start, $lte: args.end },
      $or: [{ "clockIn.flag": true }, { "clockOut.flag": true }],
    })
      .sort({ date: -1 })
      .lean();
  }

  static async listEmployeesByPinsLean(pins: string[]) {
    return Employee.find({ pin: { $in: pins } }).lean();
  }
}

