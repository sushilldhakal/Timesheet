import mongoose from "mongoose"

export type UserTenantRole =
  | "admin"
  | "manager"
  | "supervisor"
  | "accounts"
  | "user"
  | "super_admin"
  | string

export interface IUserTenant {
  userId: mongoose.Types.ObjectId
  /** Employer id (tenant/org) */
  tenantId: mongoose.Types.ObjectId

  role: UserTenantRole
  location: string[]
  managedRoles: string[]

  isActive: boolean
  invitedBy?: mongoose.Types.ObjectId
  invitedAt?: Date
  joinedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface IUserTenantDocument extends IUserTenant, mongoose.Document {}

const userTenantSchema = new mongoose.Schema<IUserTenantDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },

    role: { type: String, required: true, default: "user" },
    location: { type: [String], default: [] },
    managedRoles: { type: [String], default: [] },

    isActive: { type: Boolean, default: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: undefined },
    invitedAt: { type: Date, default: undefined },
    joinedAt: { type: Date, default: undefined },
  },
  {
    timestamps: true,
    collection: "userTenants",
  }
)

// One user can belong to a tenant at most once
userTenantSchema.index({ userId: 1, tenantId: 1 }, { unique: true })
// Helpful query patterns
userTenantSchema.index({ tenantId: 1 })
userTenantSchema.index({ userId: 1, isActive: 1 })

export const UserTenant =
  (mongoose.models.UserTenant as mongoose.Model<IUserTenantDocument>) ??
  mongoose.model<IUserTenantDocument>("UserTenant", userTenantSchema)

