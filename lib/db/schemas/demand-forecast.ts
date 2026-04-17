import mongoose from "mongoose"

export interface IDemandForecast {
  tenantId: mongoose.Types.ObjectId
  locationId: mongoose.Types.ObjectId
  date: Date
  dayOfWeek: number
  predictedSales: number
  predictedFootfall?: number
  recommendedStaffCount: number
  actualSales?: number
  actualStaffCount?: number
  generatedAt: Date
  modelVersion: string
  createdAt?: Date
  updatedAt?: Date
}

export interface IDemandForecastDocument extends IDemandForecast, mongoose.Document {}

const demandForecastSchema = new mongoose.Schema<IDemandForecastDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    predictedSales: {
      type: Number,
      required: true,
      default: 0,
    },
    predictedFootfall: {
      type: Number,
    },
    recommendedStaffCount: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    actualSales: {
      type: Number,
    },
    actualStaffCount: {
      type: Number,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    modelVersion: {
      type: String,
      required: true,
      default: "1.0.0",
    },
  },
  {
    timestamps: true,
    collection: "demand_forecasts",
  }
)

demandForecastSchema.index({ tenantId: 1, locationId: 1, date: 1 }, { unique: true })
demandForecastSchema.index({ tenantId: 1, date: 1 })

export const DemandForecast =
  (mongoose.models.DemandForecast as mongoose.Model<IDemandForecastDocument>) ??
  mongoose.model<IDemandForecastDocument>("DemandForecast", demandForecastSchema)
