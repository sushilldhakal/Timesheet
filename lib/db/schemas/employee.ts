import mongoose from "mongoose"
import { ISchedule, ScheduleSchema } from "./schedule"

// ─── Employee Certification ────────────────────────────────
export interface IEmployeeCertification {
  type: 'wwcc' | 'police_check' | 'food_safety' | 'rsa' | 'other'
  label?: string          // for 'other'
  required: boolean       // set by admin at hire time
  provided: boolean       // updated when employee uploads proof
  expiryDate?: Date
  documentUrl?: string
}

// ─── Onboarding Status ────────────────────────────────
export interface IOnboardingStatus {
  personal: boolean
  identity: boolean
  tax: boolean
  bank: boolean
}

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
  tenantId: mongoose.Types.ObjectId
  name: string
  pin: string
  /** Legacy (pre-migration) fields */
  employer?: string[]
  location?: string[]

  /** New normalized refs */
  locationIds?: mongoose.Types.ObjectId[]
  employerIds?: mongoose.Types.ObjectId[]
  primaryLocationId?: mongoose.Types.ObjectId | null
  employerId?: mongoose.Types.ObjectId | null
  email?: string
  phone?: string
  homeAddress?: string
  address?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
  }
  dob?: string
  gender?: string
  comment?: string
  img?: string
  emergencyContact?: {
    name?: string
    relationship?: string
    phone?: string
  }
  
  // Onboarding workflow fields
  onboardingCountry?: 'AU' | 'NZ' | 'IN' | 'NP'
  onboardingWorkflowStatus?: 'not_started' | 'in_progress' | 'completed' | 'pending_review' | 'approved' | 'action_required' | 'manually_verified'
  onboardingInvitedBy?: mongoose.Types.ObjectId | null  // User who created/invited this employee

  // Legal name (for payroll documents)
  legalFirstName?: string
  legalMiddleNames?: string
  legalLastName?: string
  preferredName?: string

  // Location & locale
  timeZone?: string
  locale?: string
  nationality?: string

  // References to payroll/compliance collections
  taxInfoId?: mongoose.Types.ObjectId
  bankDetailsId?: mongoose.Types.ObjectId
  contractId?: mongoose.Types.ObjectId

  // Employment status
  isActive?: boolean
  isProbationary?: boolean
  probationEndDate?: Date | null
  terminatedAt?: Date | null
  terminationReason?: string

  // Quick-reference tags
  skills?: string[]
  certifications?: IEmployeeCertification[]
  
  // Granular onboarding status
  onboardingStatus?: IOnboardingStatus

  // Web login password fields
  password?: string | null
  passwordSetByAdmin?: boolean
  requirePasswordChange?: boolean
  passwordChangedAt?: Date | null
  passwordSetupToken?: string | null
  passwordSetupExpiry?: Date | null
  passwordResetToken?: string | null
  passwordResetExpiry?: Date | null

  // Onboarding status
  onboardingCompleted?: boolean
  onboardingCompletedAt?: Date | null

  // Award and employment
  awardId?: mongoose.Types.ObjectId | null
  awardLevel?: string | null
  employmentType?: string | null
  standardHoursPerWeek?: number | null
  payConditions?: IPayConditionHistory[]
  schedules?: ISchedule[]
  createdAt?: Date
  updatedAt?: Date
}

export interface IEmployeeDocument extends IEmployee, mongoose.Document {
  comparePassword(candidate: string): Promise<boolean>
}

const EmployeeCertificationSchema = new mongoose.Schema<IEmployeeCertification>(
  {
    type: { 
      type: String, 
      enum: ['wwcc', 'police_check', 'food_safety', 'rsa', 'other'], 
      required: true 
    },
    label: { type: String },
    required: { type: Boolean, required: true },
    provided: { type: Boolean, default: false },
    expiryDate: { type: Date },
    documentUrl: { type: String },
  },
  { _id: false }
);

const OnboardingStatusSchema = new mongoose.Schema<IOnboardingStatus>(
  {
    personal: { type: Boolean, default: false },
    identity: { type: Boolean, default: false },
    tax: { type: Boolean, default: false },
    bank: { type: Boolean, default: false },
  },
  { _id: false }
);

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
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true, index: true },
    name: { type: String, required: true, trim: true },
    pin: { type: String, required: true },
    employer: { type: [String], default: [] },
    location: { type: [String], default: [] },

    locationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Location" }],
    employerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employer" }],
    primaryLocationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location", default: null },
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", default: null },
    email: { type: String, default: "", trim: true, lowercase: true, sparse: true, index: true },
    phone: { type: String, default: "" },
    homeAddress: { type: String, default: "" },
    address: {
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      postcode: { type: String, default: "" },
      country: { type: String, default: "Australia" },
    },
    dob: { type: String, default: "" },
    gender: { type: String, default: "" },
    comment: { type: String, default: "" },
    img: { type: String, default: "" },
    emergencyContact: {
      name: { type: String, default: "" },
      relationship: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    
    // Onboarding workflow fields
    onboardingCountry: { 
      type: String, 
      enum: ['AU', 'NZ', 'IN', 'NP'], 
      default: null 
    },
    onboardingWorkflowStatus: { 
      type: String, 
      enum: ['not_started', 'in_progress', 'completed', 'pending_review', 'approved', 'action_required', 'manually_verified'], 
      default: 'not_started' 
    },
    onboardingInvitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Legal name
    legalFirstName: String,
    legalMiddleNames: String,
    legalLastName: String,
    preferredName: String,

    // Location & locale
    timeZone: { type: String, default: 'Australia/Sydney' },
    locale: { type: String, default: 'en-AU' },
    nationality: String,

    // References to payroll/compliance collections
    taxInfoId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeTaxInfo' },
    bankDetailsId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeBankDetails' },
    contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmployeeContract' },

    // Employment status
    isActive: { type: Boolean, default: true },
    isProbationary: { type: Boolean, default: false },
    probationEndDate: { type: Date, default: null },
    terminatedAt: { type: Date, default: null },
    terminationReason: String,

    // Quick-reference tags
    skills: [String],
    certifications: { type: [EmployeeCertificationSchema], default: [] },
    
    // Granular onboarding status
    onboardingStatus: { type: OnboardingStatusSchema, default: () => ({ personal: false, identity: false, tax: false, bank: false }) },

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
    
    // Onboarding status
    onboardingCompleted: { type: Boolean, default: false },
    onboardingCompletedAt: { type: Date, default: null },
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

// Compound unique index — pins must be unique per tenant, not globally
employeeSchema.index({ tenantId: 1, pin: 1 }, { unique: true })
employeeSchema.index({ awardId: 1 })
employeeSchema.index({ locationIds: 1 })
employeeSchema.index({ employerIds: 1 })
employeeSchema.index({ tenantId: 1, isActive: 1 })
employeeSchema.index({ terminatedAt: 1 }, { sparse: true })
// Sparse compound index for efficient roster auto-population queries
employeeSchema.index(
  { tenantId: 1, "schedules.effectiveFrom": 1, "schedules.effectiveTo": 1 },
  { sparse: true }
)

// Virtual field for current team assignments (populated from EmployeeTeamAssignment)
employeeSchema.virtual("currentTeamAssignments", {
  ref: "EmployeeTeamAssignment",
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
