import mongoose from "mongoose"
import { EmployeeTeamAssignment } from "@/lib/db/schemas/employee-team-assignment"

export const EmployeeTeamAssignmentsDbQueries = {
  findLean: (filter: Record<string, unknown>) => EmployeeTeamAssignment.find(filter).lean(),
  find: (filter: Record<string, unknown>) => EmployeeTeamAssignment.find(filter),
  findOne: (filter: Record<string, unknown>) => EmployeeTeamAssignment.findOne(filter),
  findById: (id: string) => EmployeeTeamAssignment.findById(new mongoose.Types.ObjectId(id)),
  distinct: (field: string, filter: Record<string, unknown>) => (EmployeeTeamAssignment as any).distinct(field, filter),
  aggregate: (pipeline: object[]) => EmployeeTeamAssignment.aggregate(pipeline as any),
  countDocuments: (filter: Record<string, unknown>) => EmployeeTeamAssignment.countDocuments(filter),
  createDoc: (args: Record<string, unknown>) => new (EmployeeTeamAssignment as any)(args),
}
