import { DailyShift } from '@/lib/db/schemas/daily-shift';
import { Device } from '@/lib/db/schemas/device';
import { Employee } from '@/lib/db/schemas/employee';
import { Location } from '@/lib/db/schemas/location';

export class EmployeeClockDbQueries {
  static async findEmployeeByPin(pin: string) {
    return Employee.findOne({ pin }).lean();
  }

  static async findEmployeeById(employeeId: string) {
    return Employee.findById(employeeId).lean();
  }

  static async findActiveRoleAssignments(employeeId: unknown) {
    const { EmployeeTeamAssignment } = await import('@/lib/db/schemas/employee-team-assignment');
    return EmployeeTeamAssignment.find({ employeeId, isActive: true }).populate('teamId', 'name').lean();
  }

  static async findDeviceByDeviceId(deviceId: string) {
    return Device.findOne({ deviceId }).lean();
  }

  static async updateDeviceUsage(deviceMongoId: unknown, employeeId: unknown) {
    return Device.findByIdAndUpdate(deviceMongoId, {
      lastActivity: new Date(),
      lastUsedBy: employeeId,
      $inc: { totalPunches: 1 },
    });
  }

  static async findLocationsByNamesRegex(nameRegex: RegExp) {
    return Location.find({
      name: { $regex: nameRegex },
      lat: { $exists: true, $ne: null, $gte: -90, $lte: 90 },
      lng: { $exists: true, $ne: null, $gte: -180, $lte: 180 },
    }).lean();
  }

  static async upsertClockIn(pin: string, dateObj: Date, clockEvent: unknown) {
    return DailyShift.findOneAndUpdate(
      { pin, date: dateObj },
      {
        $setOnInsert: { pin, date: dateObj, source: 'clock', status: 'active' },
        $set: { clockIn: clockEvent },
      },
      { upsert: true, new: true }
    );
  }

  static async findShiftByPinAndDate(pin: string, dateObj: Date) {
    return DailyShift.findOne({ pin, date: dateObj });
  }

  static async updateClockOut(pin: string, dateObj: Date, clockEvent: unknown, computed: { totalBreakMinutes: number; totalWorkingHours: number }) {
    return DailyShift.findOneAndUpdate(
      { pin, date: dateObj },
      {
        $set: {
          clockOut: clockEvent,
          status: 'completed',
          totalBreakMinutes: computed.totalBreakMinutes,
          totalWorkingHours: computed.totalWorkingHours,
        },
      }
    );
  }

  static async updateBreakIn(pin: string, dateObj: Date, clockEvent: unknown) {
    return DailyShift.findOneAndUpdate({ pin, date: dateObj }, { $set: { breakIn: clockEvent } });
  }

  static async updateBreakOut(pin: string, dateObj: Date, clockEvent: unknown, computed: { totalBreakMinutes: number; totalWorkingHours: number }) {
    return DailyShift.findOneAndUpdate(
      { pin, date: dateObj },
      {
        $set: {
          breakOut: clockEvent,
          totalBreakMinutes: computed.totalBreakMinutes,
          totalWorkingHours: computed.totalWorkingHours,
        },
      }
    );
  }
}

