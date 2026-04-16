import mongoose from "mongoose"
import { EmployeeRoleAssignment } from "@/lib/db/schemas/employee-role-assignment"

export const EmployeeRoleAssignmentsDbQueries = {
  findLean: (filter: Record<string, unknown>) => EmployeeRoleAssignment.find(filter).lean(),
  find: (filter: Record<string, unknown>) => EmployeeRoleAssignment.find(filter),
  findOne: (filter: Record<string, unknown>) => EmployeeRoleAssignment.findOne(filter),
  findById: (id: string) => EmployeeRoleAssignment.findById(new mongoose.Types.ObjectId(id)),
  distinct: (field: string, filter: Record<string, unknown>) => (EmployeeRoleAssignment as any).distinct(field, filter),
  aggregate: (pipeline: object[]) => EmployeeRoleAssignment.aggregate(pipeline as any),
  countDocuments: (filter: Record<string, unknown>) => EmployeeRoleAssignment.countDocuments(filter),
  createDoc: (args: Record<string, unknown>) => new (EmployeeRoleAssignment as any)(args),
}

