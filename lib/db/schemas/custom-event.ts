import mongoose from "mongoose"

export interface ICustomEvent {
  tenantId: mongoose.Types.ObjectId
  /**
   * String org identifier (Tanda-ish). Back-compat: typically `String(tenantId)`.
   * Optional to avoid a breaking migration.
   */
  organizationId?: string
  /** Back-compat stored field (use `name` in new code). */
  title: string
  /** Alias for `title` (preferred). */
  name?: string
  description?: string
  /** Back-compat stored field (use `startDate` in new code). */
  startAt: Date
  /** Alias for `startAt` (preferred). */
  startDate?: Date
  /** Back-compat stored field (use `endDate` in new code). */
  endAt: Date
  /** Alias for `endAt` (preferred). */
  endDate?: Date
  discourageTimeOff?: boolean
  isAllDay?: boolean
  locationId?: mongoose.Types.ObjectId
  color?: string
  isActive: boolean
  createdBy?: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

export interface ICustomEventDocument extends ICustomEvent, mongoose.Document {}

const customEventSchema = new mongoose.Schema<ICustomEventDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    organizationId: { type: String, default: undefined, index: true },
    title: { type: String, required: true, trim: true, alias: "name" },
    description: { type: String, default: undefined },
    startAt: { type: Date, required: true, index: true, alias: "startDate" },
    endAt: { type: Date, required: true, index: true, alias: "endDate" },
    discourageTimeOff: { type: Boolean, default: false },
    isAllDay: { type: Boolean, default: false },
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", default: undefined, index: true },
    color: { type: String, default: undefined },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
  },
  {
    timestamps: true,
    collection: "custom_events",
  }
)

customEventSchema.index({ tenantId: 1, startAt: 1, endAt: 1 })
customEventSchema.index({ organizationId: 1, startAt: 1, endAt: 1 }, { sparse: true })

export const CustomEvent =
  (mongoose.models.CustomEvent as mongoose.Model<ICustomEventDocument>) ??
  mongoose.model<ICustomEventDocument>("CustomEvent", customEventSchema)

export default CustomEvent

