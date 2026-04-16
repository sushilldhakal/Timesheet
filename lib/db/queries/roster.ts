import { Roster } from "@/lib/db/schemas/roster"
import type { IShift } from "@/lib/db/schemas/roster"

export const RosterDbQueries = {
  findOne: (filter: Record<string, unknown>) => Roster.findOne(filter),
  findOneLean: (filter: Record<string, unknown>) => Roster.findOne(filter).lean(),
  findById: (id: string) => Roster.findById(id),
  create: (args: Record<string, unknown>) => Roster.create(args),
  deleteOne: (filter: Record<string, unknown>) => Roster.deleteOne(filter),
  save: (doc: any) => doc.save(),
  shifts: {
    findIndexById: (shifts: IShift[], id: string) => shifts.findIndex((s) => s._id.toString() === id),
  },
}

