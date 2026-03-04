import mongoose from "mongoose"
import { RIGHTS_LIST, type Right } from "@/lib/config/rights"

export interface IUser {
  name: string
  username: string
  password: string
  role: "admin" | "user" | "super_admin"
  tenantId: string // Reference to Tenant._id
  location: string[]
  rights: Right[]
  managedRoles: string[] // Role names that this user can supervise
  createdAt: number // Unix timestamp (seconds since epoch)
  updatedAt: number // Unix timestamp (seconds since epoch)
}

export interface IUserDocument extends IUser, mongoose.Document {
  comparePassword(candidate: string): Promise<boolean>
}

const userSchema = new mongoose.Schema<IUserDocument>(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    username: {
      type: String,
      required: true,
      unique: true,
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
      enum: ["admin", "user", "super_admin"],
      default: "user",
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    location: {
      type: [String],
      default: [],
    },
    rights: {
      type: [String],
      enum: Object.values(RIGHTS_LIST),
      default: [],
    },
    managedRoles: {
      type: [String],
      default: [],
    },
    createdAt: {
      type: Number,
      required: true,
    },
    updatedAt: {
      type: Number,
      required: true,
    },
  },
  {
    collection: "users",
  }
)

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
