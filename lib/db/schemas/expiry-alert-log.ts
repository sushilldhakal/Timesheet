import mongoose from 'mongoose'

/**
 * Tracks expiry alerts that have already been sent to prevent duplicate emails
 * within the same day. TTL index auto-deletes records after 23 hours.
 */
const expiryAlertLogSchema = new mongoose.Schema(
  {
    alertKey: { type: String, required: true, unique: true, index: true },
    sentAt: { type: Date, default: Date.now },
  },
  { collection: 'expiry_alert_logs' }
)

// Auto-expire after 23 hours so the same alert can fire again the next day
expiryAlertLogSchema.index({ sentAt: 1 }, { expireAfterSeconds: 23 * 60 * 60 })

export const ExpiryAlertLog =
  (mongoose.models.ExpiryAlertLog as mongoose.Model<any>) ??
  mongoose.model('ExpiryAlertLog', expiryAlertLogSchema)
