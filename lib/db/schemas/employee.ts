import mongoose from "mongoose"
import { ISchedule, ScheduleSchema } from "./schedule"

// ─── Pay Condition History ────────────────────────────────
export interface IPayConditionHistory {
  awardId: mongoose.Types.ObjectId;
  awardLevel: string;
  employmentType: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  overridingRate: number | null;
}

export interface IEmployee {
  name: string
  pin: string
  employer?: string[]
  location?: string[]
  email?: string
  phone?: string
  homeAddress?: string
  dob?: string
  comment?: string
  img?: string
  // Web login password fields
  password?: string | null // Hashed password for web login
  passwordSetByAdmin?: boolean // Flag if admin set initial password
  requirePasswordChange?: boolean // Force password change on first login
  passwordChangedAt?: Date | null // Last password change timestamp
  // Password setup (first time)
  passwordSetupToken?: string | null // Token for initial password setup
  passwordSetupExpiry?: Date | null // Expiry for setup token
  // Password reset
  passwordResetToken?: string | null // Token for password reset
  passwordResetExpiry?: Date | null // Expiry for reset token
  // Award and employment
  awardId?: mongoose.Types.ObjectId | null
  awardLevel?: string | null
  employmentType?: string | null
  standardHoursPerWeek?: number | null // Target hours per week for this employee
  payConditions?: IPayConditionHistory[]
  schedules?: ISchedule[]
  createdAt?: Date
  updatedAt?: Date
}

export interface IEmployeeDocument extends IEmployee, mongoose.Document {
  comparePassword(candidate: string): Promise<boolean>
}

const PayConditionHistorySchema = new mongoose.Schema<IPayConditionHistory>(
  {
    awardId: { type: mongoose.Schema.Types.ObjectId, ref: "Award", required: true },
    awardLevel: { type: String, required: true },
    employmentType: { type: String, required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    overridingRate: { type: Number, default: null },
  },
  { _id: false }
);

const employeeSchema = new mongoose.Schema<IEmployeeDocument>(
  {
    name: { type: String, required: true, trim: true },
    pin: { type: String, required: true },
    employer: { type: [String], default: [] },
    location: { type: [String], default: [] },
    email: { type: String, default: "", trim: true, lowercase: true, sparse: true, index: true },
    phone: { type: String, default: "" },
    homeAddress: { type: String, default: "" },
    dob: { type: String, default: "" },
    comment: { type: String, default: "" },
    img: { type: String, default: "" },
    // Web login password fields
    password: { type: String, default: null, select: false },
    passwordSetByAdmin: { type: Boolean, default: false },
    requirePasswordChange: { type: Boolean, default: false },
    passwordChangedAt: { type: Date, default: null },
    // Password setup
    passwordSetupToken: { type: String, default: null, select: false },
    passwordSetupExpiry: { type: Date, default: null, select: false },
    // Password reset
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpiry: { type: Date, default: null, select: false },
    // Award and employment
    awardId: { type: mongoose.Schema.Types.ObjectId, ref: "Award", default: null },
    awardLevel: { type: String, default: null },
    employmentType: { type: String, default: null },
    standardHoursPerWeek: { type: Number, default: null },
    payConditions: { type: [PayConditionHistorySchema], default: [] },
    schedules: { type: [ScheduleSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "employees",
  }
)

employeeSchema.index({ pin: 1 })
employeeSchema.index({ awardId: 1 })
// Sparse compound index for efficient roster auto-population queries
employeeSchema.index(
  { "schedules.effectiveFrom": 1, "schedules.effectiveTo": 1 },
  { sparse: true }
)

// Virtual field for current role assignments (populated from EmployeeRoleAssignment)
employeeSchema.virtual("currentRoleAssignments", {
  ref: "EmployeeRoleAssignment",
  localField: "_id",
  foreignField: "employeeId",
  match: { isActive: true }, // Only get active assignments
})

// Hash password before saving (only if modified)
employeeSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next()
  const bcrypt = await import("bcrypt")
  this.password = bcrypt.hashSync(this.password, 10)
  next()
})

// Compare password method
employeeSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false
  const bcrypt = await import("bcrypt")
  return bcrypt.compare(candidate, this.password)
}

export const Employee =
  (mongoose.models.Employee as mongoose.Model<IEmployeeDocument>) ??
  mongoose.model<IEmployeeDocument>("Employee", employeeSchema)
