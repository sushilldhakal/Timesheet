import mongoose from "mongoose"

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
  role?: string[]
  employer?: string[]
  location?: string[]
  hire?: string
  site?: string
  email?: string
  phone?: string
  dob?: string
  comment?: string
  img?: string
  awardId?: mongoose.Types.ObjectId | null
  awardLevel?: string | null
  employmentType?: string | null
  payConditions?: IPayConditionHistory[]
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
    role: { type: [String], default: [] },
    employer: { type: [String], default: [] },
    location: { type: [String], default: [] },
    hire: { type: String, default: "" },
    site: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    dob: { type: String, default: "" },
    comment: { type: String, default: "" },
    img: { type: String, default: "" },
    awardId: { type: mongoose.Schema.Types.ObjectId, ref: "Award", default: null },
    awardLevel: { type: String, default: null },
    employmentType: { type: String, default: null },
    payConditions: { type: [PayConditionHistorySchema], default: [] },
  },
  {
    timestamps: true,
    collection: "employees",
  }
)

employeeSchema.index({ pin: 1 })
employeeSchema.index({ site: 1 })
employeeSchema.index({ awardId: 1 })

export const Employee =
  (mongoose.models.Employee as mongoose.Model<IEmployeeDocument>) ??
  mongoose.model<IEmployeeDocument>("Employee", employeeSchema)
