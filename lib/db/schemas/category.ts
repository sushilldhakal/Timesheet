import mongoose from "mongoose"
import { CATEGORY_TYPES_LIST, type CategoryType } from "@/lib/config/category-types"

export type GeofenceMode = "hard" | "soft"

export interface ICategory {
  name: string
  type: CategoryType
  /** Location type only: lat/lng for geofence centre */
  lat?: number
  lng?: number
  /** Location type only: radius in metres (default 100) */
  radius?: number
  /** Location type only: "hard" = reject clock-in, "soft" = flag but allow */
  geofenceMode?: GeofenceMode
  createdAt?: Date
  updatedAt?: Date
}

export interface ICategoryDocument extends ICategory, mongoose.Document {}

const categorySchema = new mongoose.Schema<ICategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: CATEGORY_TYPES_LIST,
    },
    lat: { type: Number, default: undefined },
    lng: { type: Number, default: undefined },
    radius: { type: Number, default: undefined },
    geofenceMode: { type: String, enum: ["hard", "soft"], default: undefined },
  },
  {
    timestamps: true,
    collection: "categories",
  }
)

categorySchema.index({ type: 1 })
categorySchema.index({ type: 1, name: 1 }, { unique: true })

export const Category =
  (mongoose.models.Category as mongoose.Model<ICategoryDocument>) ??
  mongoose.model<ICategoryDocument>("Category", categorySchema)
