import { DailyShift, Employee } from "@/lib/db"

export const EmployeeSyncPhotosDbQueries = {
  listEmployeesWithoutPhotosLean: async () => {
    return Employee.find({
      $or: [{ img: { $exists: false } }, { img: "" }, { img: null }],
    })
      .select("_id pin name")
      .lean()
  },

  findEmployeeByPinOrIdLean: async (query: Record<string, unknown>) => {
    return Employee.findOne(query).select("_id pin name img").lean()
  },

  findMostRecentShiftWithImageLean: async (pin: string) => {
    return DailyShift.findOne({
      pin,
      $or: [{ "clockIn.image": { $exists: true, $ne: "" } }, { "clockOut.image": { $exists: true, $ne: "" } }],
    })
      .sort({ date: -1 })
      .select("clockIn.image clockOut.image date")
      .lean()
  },

  updateEmployeePhotoById: async (employeeId: unknown, imageUrl: string) => {
    return Employee.updateOne({ _id: employeeId }, { $set: { img: imageUrl } })
  },
}

