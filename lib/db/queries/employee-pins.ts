import { Employee } from "@/lib/db"

export const EmployeePinsDbQueries = {
  findByPinLean: async (pin: string) => {
    return Employee.findOne({ pin }).lean()
  },

  listPinsLean: async () => {
    return Employee.find({}, { pin: 1 }).lean()
  },
}

