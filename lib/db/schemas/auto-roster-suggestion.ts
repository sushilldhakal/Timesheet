import mongoose from "mongoose"

export interface ISuggestedEmployee {
  employeeId: mongoose.Types.ObjectId
  roleId: mongoose.Types.ObjectId
  confidenceScore: number
  reasons: string[]
}

export interface IAutoRosterSuggestion {
  tenantId: mongoose.Types.ObjectId
  locationId: mongoose.Types.ObjectId
  date: Date
  roleId: mongoose.Types.ObjectId
  suggestedEmployees: ISuggestedEmployee[]
  forecastId: mongoose.Types.ObjectId
  status: "pending" | "accepted" | "modified" | "dismissed"
  generatedAt: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface IAutoRosterSuggestionDocument extends IAutoRosterSuggestion, mongoose.Document {}

const suggestedEmployeeSchema = new mongoose.Schema<ISuggestedEmployee>(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    reasons: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
)

const autoRosterSuggestionSchema = new mongoose.Schema<IAutoRosterSuggestionDocument>(
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
    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    suggestedEmployees: {
      type: [suggestedEmployeeSchema],
      default: [],
    },
    forecastId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DemandForecast",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "modified", "dismissed"],
      default: "pending",
      required: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
    collection: "auto_roster_suggestions",
  }
)

autoRosterSuggestionSchema.index({ tenantId: 1, locationId: 1, date: 1 })
autoRosterSuggestionSchema.index({ tenantId: 1, status: 1 })

export const AutoRosterSuggestion =
  (mongoose.models.AutoRosterSuggestion as mongoose.Model<IAutoRosterSuggestionDocument>) ??
  mongoose.model<IAutoRosterSuggestionDocument>("AutoRosterSuggestion", autoRosterSuggestionSchema)
