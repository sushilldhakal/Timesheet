import mongoose from "mongoose"

export function oid(id?: string) {
  return id ? new mongoose.Types.ObjectId(id) : new mongoose.Types.ObjectId()
}

export function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id)
}

