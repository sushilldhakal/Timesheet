import mongoose from "mongoose"

export interface ILocationSalesTarget {
  tenantId: mongoose.Types.ObjectId
  locationId: mongoose.Types.ObjectId
  /** Target date (typically start-of-day in tenant timezone). */
  date: Date
  /** Back-compat stored field (use `target` in new code). */
  targetAmount: number
  /** Alias for `targetAmount` (preferred). */
  target?: number
  currency?: string
  notes?: string
  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface ILocationSalesTargetDocument extends ILocationSalesTarget, mongoose.Document {}

const locationSalesTargetSchema = new mongoose.Schema<ILocationSalesTargetDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", required: true, index: true },
    date: { type: Date, required: true, index: true },
    targetAmount: { type: Number, required: true, min: 0, alias: "target" },
    currency: { type: String, default: "AUD" },
    notes: { type: String, default: undefined },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  {
    timestamps: true,
    collection: "location_sales_targets",
  }
)

locationSalesTargetSchema.index({ tenantId: 1, locationId: 1, date: 1 }, { unique: true })

export const LocationSalesTarget =
  (mongoose.models.LocationSalesTarget as mongoose.Model<ILocationSalesTargetDocument>) ??
  mongoose.model<ILocationSalesTargetDocument>("LocationSalesTarget", locationSalesTargetSchema)

export default LocationSalesTarget

