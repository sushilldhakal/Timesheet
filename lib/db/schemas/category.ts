import mongoose from "mongoose"
import { CATEGORY_TYPES_LIST, type CategoryType } from "@/lib/config/category-types"

export type GeofenceMode = "hard" | "soft"

export interface IShiftPattern {
  dayOfWeek?: number[]
  startHour?: number
  endHour?: number
  description?: string
}

export interface IDefaultScheduleTemplate {
  standardHoursPerWeek?: number
  shiftPattern?: IShiftPattern
}

export interface ICategory {
  name: string
  type: CategoryType
  /** Location type only: lat/lng for geofence centre */
  lat?: number
  lng?: number
  /** Location type only: physical address */
  address?: string
  /** Location type only: radius in metres (default 100) */
  radius?: number
  /** Location type only: "hard" = reject clock-in, "soft" = flag but allow */
  geofenceMode?: GeofenceMode
  /** Location type only: opening hour (0-23) */
  openingHour?: number
  /** Location type only: closing hour (0-24) */
  closingHour?: number
  /** Location type only: working days (0=Sunday, 6=Saturday) */
  workingDays?: number[]
  /** Role and Employer type only: color for visual identification */
  color?: string
  /** Role type only: default schedule template for quick employee setup */
  defaultScheduleTemplate?: IDefaultScheduleTemplate
  /** Location type only: Virtual field - enabled roles at this location (populated from LocationRoleEnablement) */
  enabledRoles?: any[]
  /** Role type only: Virtual field - locations where this role is enabled (populated from LocationRoleEnablement) */
  enabledLocations?: any[]
  createdAt?: Date
  updatedAt?: Date
}

export interface ICategoryDocument extends ICategory, mongoose.Document {}

// Define nested schemas for better type safety and Mongoose handling
const shiftPatternSchema = new mongoose.Schema({
  dayOfWeek: { type: [Number] },
  startHour: { type: Number },
  endHour: { type: Number },
  description: { type: String },
}, { _id: false })

const defaultScheduleTemplateSchema = new mongoose.Schema({
  standardHoursPerWeek: { type: Number },
  shiftPattern: { type: shiftPatternSchema },
}, { _id: false })

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
    address: { type: String, trim: true, default: undefined },
    radius: { type: Number, default: undefined },
    geofenceMode: { type: String, enum: ["hard", "soft"], default: undefined },
    openingHour: { type: Number, min: 0, max: 23, default: undefined },
    closingHour: { type: Number, min: 0, max: 24, default: undefined },
    workingDays: { type: [Number], default: undefined },
    color: { type: String, default: undefined },
    defaultScheduleTemplate: { type: defaultScheduleTemplateSchema },
  },
  {
    timestamps: true,
    collection: "categories",
  }
)

categorySchema.index({ type: 1 })
categorySchema.index({ type: 1, name: 1 }, { unique: true })

// Virtual field for locations: populate enabled roles from LocationRoleEnablement
categorySchema.virtual("enabledRoles", {
  ref: "LocationRoleEnablement",
  localField: "_id",
  foreignField: "locationId",
  match: { isActive: true }, // Only get active enablements
})

// Virtual field for roles: populate enabled locations from LocationRoleEnablement
categorySchema.virtual("enabledLocations", {
  ref: "LocationRoleEnablement",
  localField: "_id",
  foreignField: "roleId",
  match: { isActive: true }, // Only get active enablements
})

// Ensure virtuals are included when converting to JSON/Object
categorySchema.set("toJSON", { virtuals: true })
categorySchema.set("toObject", { virtuals: true })

export const Category =
  (mongoose.models.Category as mongoose.Model<ICategoryDocument>) ??
  mongoose.model<ICategoryDocument>("Category", categorySchema)
