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
  dob?: string
  comment?: string
  img?: string
  awardId?: mongoose.Types.ObjectId | null
  awardLevel?: string | null
  employmentType?: string | null
  standardHoursPerWeek?: number | null // NEW: Target hours per week for this employee
  payConditions?: IPayConditionHistory[]
  schedules?: ISchedule[]
  createdAt?: Date
  updatedAt?: Date
}

export interface IEmployeeDocument extends IEmployee, mongoose.Document {}

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
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    dob: { type: String, default: "" },
    comment: { type: String, default: "" },
    img: { type: String, default: "" },
    awardId: { type: mongoose.Schema.Types.ObjectId, ref: "Award", default: null },
    awardLevel: { type: String, default: null },
    employmentType: { type: String, default: null },
    standardHoursPerWeek: { type: Number, default: null }, // NEW
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

export const Employee =
  (mongoose.models.Employee as mongoose.Model<IEmployeeDocument>) ??
  mongoose.model<IEmployeeDocument>("Employee", employeeSchema)
