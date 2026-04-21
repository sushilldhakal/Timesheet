import mongoose, { Schema, Document } from "mongoose"

export interface IPublicHoliday {
  date: Date
  name: string // "Christmas Day"
  state: 'NAT' | 'NSW' | 'VIC' | 'QLD' | 'SA' | 'WA' | 'TAS' | 'ACT' | 'NT'
  // NAT = applies to all states
  isRecurring: boolean // fixed date every year (true) vs calculated (false)
  createdAt: Date
}

export interface IPublicHolidayDocument extends IPublicHoliday, Document {}

const publicHolidaySchema = new Schema<IPublicHolidayDocument>(
  {
    date: { 
      type: Date, 
      required: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    state: {
      type: String,
      enum: ['NAT', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'],
      required: true
    },
    isRecurring: { 
      type: Boolean, 
      required: true 
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "public_holidays"
  }
)

// Unique compound index to prevent duplicates
publicHolidaySchema.index({ date: 1, state: 1, name: 1 }, { unique: true })

// Additional index for efficient queries
publicHolidaySchema.index({ date: 1, state: 1 })

export const PublicHoliday = 
  (mongoose.models.PublicHoliday as mongoose.Model<IPublicHolidayDocument>) ??
  mongoose.model<IPublicHolidayDocument>("PublicHoliday", publicHolidaySchema)