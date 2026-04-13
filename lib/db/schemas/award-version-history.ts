import mongoose from 'mongoose'

export interface IAwardVersionHistory extends mongoose.Document {
  tenantId: mongoose.Types.ObjectId
  baseAwardId: mongoose.Types.ObjectId

  name: string
  description?: string
  rules: any[]
  levelRates: any[]
  availableTags: any[]

  version: string
  effectiveFrom: Date
  effectiveTo?: Date | null
  changelog?: string

  createdBy: mongoose.Types.ObjectId
  createdAt: Date
}

export interface IAwardVersionHistoryDocument extends IAwardVersionHistory, mongoose.Document {}

const awardVersionHistorySchema = new mongoose.Schema<IAwardVersionHistoryDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employer',
      index: true
    },
    baseAwardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Award',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    description: String,
    rules: [{
      type: mongoose.Schema.Types.Mixed
    }],
    levelRates: [{
      type: mongoose.Schema.Types.Mixed
    }],
    availableTags: [{
      type: mongoose.Schema.Types.Mixed
    }],
    version: {
      type: String,
      required: true
    },
    effectiveFrom: {
      type: Date,
      required: true,
      index: true
    },
    effectiveTo: {
      type: Date,
      index: true
    },
    changelog: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    collection: 'award_version_history'
  }
)

awardVersionHistorySchema.index({ baseAwardId: 1, effectiveFrom: 1, effectiveTo: 1 })
awardVersionHistorySchema.index({ baseAwardId: 1, version: 1 }, { unique: true })

export const AwardVersionHistory =
  (mongoose.models.AwardVersionHistory as mongoose.Model<IAwardVersionHistoryDocument>) ??
  mongoose.model<IAwardVersionHistoryDocument>('AwardVersionHistory', awardVersionHistorySchema)
