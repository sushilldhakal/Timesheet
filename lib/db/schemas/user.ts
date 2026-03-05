import mongoose from "mongoose"
import { RIGHTS_LIST, type Right } from "@/lib/config/rights"

export interface IUser {
  name: string
  username: string
  email: string // Email for unified login
  password: string
  role: "admin" | "user" | "super_admin"

  location: string[]
  rights: Right[]
  managedRoles: string[] // Role names that this user can supervise
  passwordResetToken?: string | null // Token for password reset
  passwordResetExpiry?: Date | null // Expiry for reset token
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
    email: {
      type: String,
      required: false, // Optional for backward compatibility
      trim: true,
      lowercase: true,
      sparse: true, // Allows null but enforces uniqueness when present
      index: true,
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
