import { Award, DailyShift, Employee, Roster } from "@/lib/db"

export class AnalyticsDbQueries {
  static async findRosterByShiftId(shiftId: string) {
    return Roster.findOne({ "shifts._id": shiftId })
  }

  static async findRosterByWeekId(weekId: string) {
    return Roster.findOne({ weekId })
  }

  static async findRostersOverlappingRange(args: { start: Date; end: Date }) {
    return Roster.find({
      weekStartDate: { $lte: args.end },
      weekEndDate: { $gte: args.start },
    })
  }

  static async findDailyShiftByEmployeeAndDate(args: { employeeId: string; date: Date }) {
    return DailyShift.findOne({ employeeId: args.employeeId, date: args.date })
  }

  static async findEmployeeById(employeeId: string) {
    return Employee.findById(employeeId)
  }

  static async findAwardById(awardId: string) {
    return Award.findById(awardId)
  }
}

