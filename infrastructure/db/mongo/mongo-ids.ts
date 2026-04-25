import mongoose from "mongoose"

export function toObjectId(id: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error("Invalid id")
  }
  return new mongoose.Types.ObjectId(id)
}

export function toObjectIdOrNull(id: string | null | undefined): mongoose.Types.ObjectId | null {
  if (!id) return null
  return toObjectId(id)
}

