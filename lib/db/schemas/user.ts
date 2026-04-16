import mongoose from "mongoose"
import { RIGHTS_LIST, type Right } from "@/lib/config/rights"

/** Per-day visible working window in the scheduler (hours as decimals); null = use app default for that day */
export type SchedulingDayHours = { from: number; to: number } | null

export interface IUserSchedulingSettings {
  visibleFrom: number
  visibleTo: number
  /** Keys 0–6 (Sun–Sat); omitted keys use app defaults */
  workingHours: Partial<Record<number, SchedulingDayHours>>
}

export interface IUser {
  tenantId: mongoose.Types.ObjectId
  name: string
  email: string
  password: string
  role: "admin" | "manager" | "supervisor" | "accounts" | "user" | "super_admin"

  /** Legacy (pre-migration) fields */
  location: string[]
  rights: Right[] // @deprecated - use role-based permissions instead
  managedRoles: string[] // Role names that this user can supervise

  /** New normalized refs */
  locationIds?: mongoose.Types.ObjectId[]
  managedRoleIds?: mongoose.Types.ObjectId[]
  /** Teams this user explicitly manages (permission scoping). */
  teamIds?: mongoose.Types.ObjectId[]
  createdBy: string | null
  /** Personal scheduler UI preferences; null = use built-in defaults */
  schedulingSettings?: IUserSchedulingSettings | null
  passwordResetToken?: string | null // Token for password reset
  passwordResetExpiry?: Date | null // Expiry for reset token
  createdAt: number // Unix timestamp (seconds since epoch)
  updatedAt: number // Unix timestamp (seconds since epoch)
}

export interface IUserDocument extends IUser, mongoose.Document {
  comparePassword(candidate: string): Promise<boolean>
}

/**
 * User Schema with Role-Based Access Control
 * 
 * Role-to-Scope Mapping:
 * - super_admin: Global scope (all locations, all roles) - hidden from UI
 * - admin: Global scope (all locations, all roles)
 * - manager: Location scope (location[] array) - can create supervisors
 * - supervisor: Location + Role scope (location[] AND managedRoles[] arrays)
 * - accounts: Global scope if location[] empty, otherwise location scope
 * - user: @deprecated Location scope (location[] array) - kept for backward compatibility
 * 
 * Permission Hierarchy:
 * super_admin → admin → manager → supervisor
 *                  └→ accounts
 * 
 * Creation Rights:
 * - super_admin: can create any role
 * - admin: can create manager, supervisor, accounts
 * - manager: can create supervisor (within their locations only)
 * - supervisor: cannot create users
 * - accounts: cannot create users
 */
const userSchema = new mongoose.Schema<IUserDocument>(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "supervisor", "accounts", "user", "super_admin"],
      default: "user",
    },

    location: {
      type: [String],
      default: [],
    },
    locationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Location" }],
    rights: {
      type: [String],
      enum: Object.values(RIGHTS_LIST),
      default: [],
    },
    managedRoles: {
      type: [String],
      default: [],
    },
    managedRoleIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
    teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
    createdBy: {
      type: String,
      default: null,
    },
    schedulingSettings: {
      type: new mongoose.Schema(
        {
          visibleFrom: { type: Number, required: true },
          visibleTo: { type: Number, required: true },
          workingHours: { type: mongoose.Schema.Types.Mixed, default: {} },
        },
        { _id: false }
      ),
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
      select: false,
    },
    passwordResetExpiry: {
      type: Date,
      default: null,
      select: false,
    },
    createdAt: {
      type: Number,
      default: () => Math.floor(Date.now() / 1000),
    },
    updatedAt: {
      type: Number,
      default: () => Math.floor(Date.now() / 1000),
    },
  },
  {
    collection: "users",
  }
)

userSchema.index({ tenantId: 1, email: 1 }, { unique: true })
userSchema.index({ role: 1 })

// Normalize legacy location string to array
userSchema.pre("save", async function (next) {
  if (this.location && !Array.isArray(this.location)) {
    this.location = this.location ? [String(this.location)] : []
  }
  next()
})

// Set timestamps as Unix seconds
userSchema.pre("save", async function (next) {
  const now = Math.floor(Date.now() / 1000)
  if (this.isNew) {
    this.createdAt = now
  }
  this.updatedAt = now
  next()
})

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  
  // Check if password is already hashed (starts with $2b$ which is bcrypt format)
  if (this.password && this.password.startsWith("$2b$")) {
    // Password is already hashed, don't hash again
    return next()
  }
  
  const bcrypt = await import("bcrypt")
  this.password = bcrypt.hashSync(this.password, 10)
  next()
})

userSchema.methods.comparePassword = async function (candidate: string) {
  const bcrypt = await import("bcrypt")
  return bcrypt.compare(candidate, this.password)
}

export const User =
  (mongoose.models.User as mongoose.Model<IUserDocument>) ??
  mongoose.model<IUserDocument>("User", userSchema)
