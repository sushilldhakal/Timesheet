import mongoose from "mongoose"

export type NotificationTarget = "user" | "employee"
export type NotificationCategory =
  | "shift_reminder"
  | "shift_swap_request"
  | "shift_swap_approved"
  | "shift_swap_denied"
  | "compliance_warning"
  | "compliance_breach"
  | "roster_published"
  | "timesheet_approved"
  | "timesheet_rejected"
  | "pay_run_ready"
  | "clock_in_missed"
  | "leave_approved"
  | "leave_denied"
  | "system"

export type NotificationChannel = "in_app" | "email" | "push"

export interface INotification {
  tenantId: mongoose.Types.ObjectId
  targetType: NotificationTarget
  userId?: mongoose.Types.ObjectId
  employeeId?: mongoose.Types.ObjectId
  category: NotificationCategory
  title: string
  message: string
  read: boolean
  readAt?: Date
  sentAt: Date
  relatedEntity?: { type: string; id: string }
  channels: NotificationChannel[]
  emailSentAt?: Date
  pushSentAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface INotificationDocument extends INotification, mongoose.Document {}

const notificationSchema = new mongoose.Schema<INotificationDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["user", "employee"],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
    category: {
      type: String,
      enum: [
        "shift_reminder",
        "shift_swap_request",
        "shift_swap_approved",
        "shift_swap_denied",
        "compliance_warning",
        "compliance_breach",
        "roster_published",
        "timesheet_approved",
        "timesheet_rejected",
        "pay_run_ready",
        "clock_in_missed",
        "leave_approved",
        "leave_denied",
        "system",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: { type: Date },
    sentAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    relatedEntity: {
      type: {
        type: String,
        required: true,
      },
      id: {
        type: String,
        required: true,
      },
    },
    channels: {
      type: [String],
      enum: ["in_app", "email", "push"],
      default: ["in_app"],
    },
    emailSentAt: { type: Date },
    pushSentAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
)

notificationSchema.index({ tenantId: 1, userId: 1, read: 1, sentAt: -1 })
notificationSchema.index({ tenantId: 1, employeeId: 1, read: 1, sentAt: -1 })
notificationSchema.index({ tenantId: 1, sentAt: -1 })

export const Notification =
  (mongoose.models.Notification as mongoose.Model<INotificationDocument>) ??
  mongoose.model<INotificationDocument>("Notification", notificationSchema)
