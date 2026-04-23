import mongoose from "mongoose"

export type GeofenceMode = "hard" | "soft"

export interface ILocation {
  tenantId: mongoose.Types.ObjectId
  name: string
  code?: string
  address?: string
  country?: 'AU' | 'NZ' | 'IN' | 'NP'
  state?: string
  lat?: number
  lng?: number
  radius?: number
  geofenceMode?: GeofenceMode
  openingHour?: number
  closingHour?: number
  workingDays?: number[]
  timezone?: string
  costCenterId?: string
  color?: string
  order?: number
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface ILocationDocument extends ILocation, mongoose.Document {}

const locationSchema = new mongoose.Schema<ILocationDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, default: undefined },
    address: { type: String, trim: true, default: undefined },
    country: { type: String, enum: ["AU", "NZ", "IN", "NP"], default: "AU" },
    state: { type: String, trim: true, default: undefined },
    lat: { type: Number, default: undefined },
    lng: { type: Number, default: undefined },
    radius: { type: Number, default: 100 },
    geofenceMode: { type: String, enum: ["hard", "soft"], default: undefined },
    openingHour: { type: Number, min: 0, max: 23, default: undefined },
    closingHour: { type: Number, min: 0, max: 24, default: undefined },
    workingDays: { type: [Number], default: undefined },
    timezone: { type: String, default: "Australia/Sydney" },
    costCenterId: { type: String, trim: true, default: undefined },
    color: { type: String, default: undefined },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  {
    timestamps: true,
    collection: "locations",
  }
)

locationSchema.index({ tenantId: 1, name: 1 }, { unique: true })

export const Location =
  (mongoose.models.Location as mongoose.Model<ILocationDocument>) ??
  mongoose.model<ILocationDocument>("Location", locationSchema)

