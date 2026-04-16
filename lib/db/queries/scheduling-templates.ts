import mongoose from "mongoose"
import { RosterTemplate } from "@/lib/db/schemas/roster-template"
import { Roster } from "@/lib/db/schemas/roster"

export function oid(id?: string) {
  return id ? new mongoose.Types.ObjectId(id) : new mongoose.Types.ObjectId()
}

export const SchedulingTemplatesDbQueries = {
  rosterTemplate: {
    create: (args: Record<string, unknown>) => RosterTemplate.create(args),
    findById: (id: string) => RosterTemplate.findById(id),
    findByIdLean: (id: string) => RosterTemplate.findById(id).lean(),
    findOne: (filter: Record<string, unknown>) => RosterTemplate.findOne(filter),
    find: (filter: Record<string, unknown>) => RosterTemplate.find(filter),
    findLean: (filter: Record<string, unknown>) => RosterTemplate.find(filter).lean(),
    deleteOne: (filter: Record<string, unknown>) => RosterTemplate.deleteOne(filter),
    findByIdAndDelete: (id: string) => RosterTemplate.findByIdAndDelete(id),
  },
  roster: {
    findOne: (filter: Record<string, unknown>) => Roster.findOne(filter),
    create: (args: Record<string, unknown>) => Roster.create(args),
  },
}

