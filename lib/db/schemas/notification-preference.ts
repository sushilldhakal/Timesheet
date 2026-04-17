import mongoose from 'mongoose'

export type NotificationPrefCategory =
  | 'roster_published'
  | 'shift_swap_request'
  | 'shift_swap_approved'
  | 'shift_swap_denied'
  | 'compliance_breach'
  | 'system'
  | 'pay_run_ready'

export type NotificationPrefChannel = 'in_app' | 'push' | 'email'

export interface ICategoryPreference {
  category: NotificationPrefCategory
  channels: NotificationPrefChannel[]
  enabled: boolean
}

export interface INotificationPreference {
  tenantId: mongoose.Types.ObjectId
  recipientId: string
  recipientType: 'user' | 'employee'
  preferences: ICategoryPreference[]
  globalPushEnabled: boolean
  globalEmailEnabled: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface INotificationPreferenceDocument extends INotificationPreference, mongoose.Document {}

const schema = new mongoose.Schema<INotificationPreferenceDocument>(
  {
    tenantId:          { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientId:       { type: String, required: true },
    recipientType:     { type: String, enum: ['user', 'employee'], required: true },
    preferences: [{
      category:  { type: String, required: true },
      channels:  [{ type: String, enum: ['in_app', 'push', 'email'] }],
      enabled:   { type: Boolean, default: true },
      _id:       false,
    }],
    globalPushEnabled:  { type: Boolean, default: true },
    globalEmailEnabled: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'notification_preferences' }
)

schema.index({ tenantId: 1, recipientId: 1, recipientType: 1 }, { unique: true })

export const NotificationPreference =
  (mongoose.models.NotificationPreference as mongoose.Model<INotificationPreferenceDocument>) ??
  mongoose.model<INotificationPreferenceDocument>('NotificationPreference', schema)
