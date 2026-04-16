import mongoose from "mongoose"
import { LocationRoleEnablement } from "@/lib/db/schemas/location-role-enablement"

export const LocationRoleEnablementDbQueries = {
  findOne: (filter: Record<string, unknown>) => LocationRoleEnablement.findOne(filter),
  find: (filter: Record<string, unknown>) => LocationRoleEnablement.find(filter),
  findById: (id: string) => LocationRoleEnablement.findById(new mongoose.Types.ObjectId(id)),
  insertMany: (docs: Record<string, unknown>[]) => LocationRoleEnablement.insertMany(docs),
  createDoc: (args: Record<string, unknown>) => new (LocationRoleEnablement as any)(args),
}

