import mongoose from "mongoose"

export interface ILabourCostAnalysis {
  tenantId: mongoose.Types.ObjectId
  locationId: mongoose.Types.ObjectId
  periodStart: Date
  periodEnd: Date
  rosterCost: number
  actualCost: number
  variance: number
  variancePct: number
  totalRosterHours: number
  totalActualHours: number
  employeeCount: number
  generatedAt: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface ILabourCostAnalysisDocument extends ILabourCostAnalysis, mongoose.Document {}

const labourCostAnalysisSchema = new mongoose.Schema<ILabourCostAnalysisDocument>(
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
    periodStart: {
      type: Date,
      required: true,
    },
    periodEnd: {
      type: Date,
      required: true,
    },
    rosterCost: {
      type: Number,
      required: true,
      default: 0,
    },
    actualCost: {
      type: Number,
      required: true,
      default: 0,
    },
    variance: {
      type: Number,
      required: true,
      default: 0,
    },
    variancePct: {
      type: Number,
      required: true,
      default: 0,
    },
    totalRosterHours: {
      type: Number,
      required: true,
      default: 0,
    },
    totalActualHours: {
      type: Number,
      required: true,
      default: 0,
    },
    employeeCount: {
      type: Number,
      required: true,
      default: 0,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
    collection: "labour_cost_analyses",
  }
)

labourCostAnalysisSchema.index({ tenantId: 1, locationId: 1, periodStart: 1, periodEnd: 1 })
labourCostAnalysisSchema.index({ tenantId: 1, generatedAt: -1 })

export const LabourCostAnalysis =
  (mongoose.models.LabourCostAnalysis as mongoose.Model<ILabourCostAnalysisDocument>) ??
  mongoose.model<ILabourCostAnalysisDocument>("LabourCostAnalysis", labourCostAnalysisSchema)
