import { DailyShift, Employee, Location } from "@/lib/db"
import { EmployeeTeamAssignment } from "@/lib/db/schemas/employee-team-assignment"
import Award from "@/lib/db/schemas/award"
import type { IEmployeeDocument } from "@/lib/db/schemas/employee"

/**
 * Employee kiosk / portal auth reads (Mongoose implementation).
 * Password change still returns a document with instance methods (`comparePassword`, `save`).
 */
export const MongoEmployeeAuthQueries = {
  findEmployeeByPinLean: async (pin: string) => {
    return Employee.findOne({ pin }).lean()
  },

  findEmployeeByIdLean: async (employeeId: string) => {
    return Employee.findById(employeeId).lean()
  },

  findEmployeeByIdWithPassword: async (employeeId: string): Promise<IEmployeeDocument | null> => {
    return Employee.findById(employeeId).select("+password")
  },

  listRoleAssignmentsWithRoleLean: async (employeeId: unknown) => {
    return EmployeeTeamAssignment.find({ employeeId, isActive: true }).populate("teamId", "name").lean()
  },

  listRoleAssignmentsWithRoleAndLocationLean: async (employeeId: unknown) => {
    return EmployeeTeamAssignment.find({ employeeId, isActive: true })
      .populate("teamId", "name")
      .populate("locationId", "name")
      .lean()
  },

  listLocationsForGeofenceLean: async (names: string[]) => {
    return Location.find({
      name: { $in: names },
      lat: { $exists: true, $ne: null },
      lng: { $exists: true, $ne: null },
    }).lean()
  },

  findShiftForDateLean: async (pin: string, date: Date) => {
    return DailyShift.findOne({ pin, date }).lean()
  },

  findAwardNameLean: async (awardId: unknown) => {
    return Award.findById(awardId).select("_id name").lean()
  },

  findMostRecentShiftWithClockInImageLean: async (pin: string) => {
    return DailyShift.findOne({
      pin,
      "clockIn.image": { $exists: true, $ne: "" },
    })
      .sort({ date: -1 })
      .select({ "clockIn.image": 1 })
      .lean()
  },
}
