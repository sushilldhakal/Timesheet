import mongoose from 'mongoose';
import { Roster } from '@/lib/db/schemas/roster';

export class CalendarDbQueries {
  static async findRostersOverlapping(startDate: Date, endDate: Date) {
    return Roster.find({
      weekStartDate: { $lte: endDate },
      weekEndDate: { $gte: startDate },
    })
      .populate('shifts.employeeId', 'name picturePath employer')
      .populate('shifts.roleId', 'name')
      .populate('shifts.locationId', 'name');
  }

  static async findRosterByWeekId(weekId: string) {
    return Roster.findOne({ weekId });
  }

  static async findRosterContainingShift(shiftId: string) {
    return Roster.findOne({ 'shifts._id': new mongoose.Types.ObjectId(shiftId) });
  }

  static async pullShiftById(shiftId: string) {
    return Roster.updateOne(
      { 'shifts._id': new mongoose.Types.ObjectId(shiftId) },
      { $pull: { shifts: { _id: new mongoose.Types.ObjectId(shiftId) } } }
    );
  }
}

