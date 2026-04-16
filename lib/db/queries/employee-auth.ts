import { DailyShift, Employee, Location } from "@/lib/db"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"
import Award from "@/lib/db/schemas/award"

export const EmployeeAuthDbQueries = {
  findEmployeeByPinLean: async (pin: string) => {
    return Employee.findOne({ pin }).lean()
  },

  findEmployeeByIdLean: async (employeeId: string) => {
    return Employee.findById(employeeId).lean()
  },

  findEmployeeByIdWithPassword: async (employeeId: string) => {
    return Employee.findById(employeeId).select("+password")
  },

  listRoleAssignmentsWithRoleLean: async (employeeId: unknown) => {
    return EmployeeRoleAssignment.find({ employeeId, isActive: true }).populate("roleId", "name").lean()
  },

  listRoleAssignmentsWithRoleAndLocationLean: async (employeeId: unknown) => {
    return EmployeeRoleAssignment.find({ employeeId, isActive: true })
      .populate("roleId", "name")
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

