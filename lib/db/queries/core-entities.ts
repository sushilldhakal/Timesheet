import mongoose from "mongoose"
import { Location } from "@/lib/db/schemas/location"
import { Team } from "@/lib/db/schemas/team"

export const CoreEntitiesDbQueries = {
  locationFindById: (id: string) => Location.findById(new mongoose.Types.ObjectId(id)),
  teamFindById: (id: string) => Team.findById(new mongoose.Types.ObjectId(id)),
  locationsFindByIds: (ids: string[]) => Location.find({ _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } }),
}

