import mongoose from 'mongoose'

export interface IEmployeeCompliance {
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  country?: 'AU' | 'NZ' | 'IN' | 'NP'
  workRightsType?: 'au_citizen' | 'au_resident' | 'visa_holder' | 'unknown'
  australianIdType?: 'drivers_licence' | 'medicare' | 'passport' | null
  australianIdNumber?: string | null
  
  // AU tax fields (stored here alongside work rights for AU employees)
  tfn?: string
  taxFreeThreshold?: boolean
  hasHelpDebt?: boolean

  // AU visa holder detail fields
  passportNumber?: string
  passportExpiry?: Date
  visaSubclass?: string       // e.g. '482', '457', '417'
  visaGrantNumber?: string
  visaWorkConditions?: string // free-text conditions on visa
  passportDocUrl?: string     // uploaded passport scan
  visaDocUrl?: string         // uploaded visa grant notice
  
  visaType?: string | null
  visaNumber?: string | null
  maxHoursPerFortnight?: number | null  // for student visa rostering limits
  workRightsStatus?: 'unverified' | 'verified' | 'failed'
  workRightsLastCheckedAt?: Date | null
  
  // Nepal (Phase 1)
  citizenshipCertNumber?: string
  citizenshipIssuedDistrict?: string
  citizenshipIssuedDate?: Date
  citizenshipDocFrontUrl?: string
  citizenshipDocBackUrl?: string
  nationalIdNumber?: string   // NIN (optional)
  panNepal?: string           // Nepal PAN (tax, optional)
  ssfNumber?: string          // Social Security Fund
  
  // NZ (schema-complete, UI deferred)
  irdNumber?: string
  taxCodeNZ?: string
  kiwiSaverOptIn?: boolean
  kiwiSaverFund?: string
  kiwiSaverContributionRate?: number
  
  // India (schema-complete, UI deferred)
  aadhaarNumber?: string
  aadhaarVerified?: boolean
  aadhaarVerifiedAt?: Date
  panNumber?: string
  panVerified?: boolean
  panVerifiedAt?: Date
  uanNumber?: string
  esiEligible?: boolean
  
  wwcStatus?: 'not_required' | 'pending' | 'active' | 'expired'
  wwcNumber?: string
  wwcExpiryDate?: Date
  policeClearanceStatus?: 'pending' | 'active' | 'expired'
  policeClearanceNumber?: string
  policeClearanceExpiryDate?: Date
  foodHandlingStatus?: 'current' | 'expired'
  foodHandlingExpiryDate?: Date
  healthSafetyCertifications?: string[]
  inductionCompleted: boolean
  inductionDate?: Date
  inductionDocUrl?: string
  codeOfConductSigned: boolean
  codeOfConductDate?: Date
  codeOfConductDocUrl?: string
  lastComplianceCheckDate?: Date
  createdAt?: Date
  updatedAt?: Date
}

const employeeComplianceSchema = new mongoose.Schema<IEmployeeCompliance>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employer',
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    country: {
      type: String,
      enum: ['AU', 'NZ', 'IN', 'NP'],
      default: null,
    },
    workRightsType: {
      type: String,
      enum: ['au_citizen', 'au_resident', 'visa_holder', 'unknown'],
      default: 'unknown',
    },
    australianIdType: {
      type: String,
      enum: ['drivers_licence', 'medicare', 'passport'],
      default: null,
    },
    australianIdNumber: { type: String, default: null },
    
    // AU tax fields
    tfn: { type: String, default: null },
    taxFreeThreshold: { type: Boolean, default: null },
    hasHelpDebt: { type: Boolean, default: null },

    // AU visa holder detail fields
    passportNumber: { type: String, default: null },
    passportExpiry: { type: Date, default: null },
    visaSubclass: { type: String, default: null },
    visaGrantNumber: { type: String, default: null },
    visaWorkConditions: { type: String, default: null },
    passportDocUrl: { type: String, default: null },
    visaDocUrl: { type: String, default: null },
    
    visaType: { type: String, default: null },
    visaNumber: { type: String, default: null },
    maxHoursPerFortnight: { type: Number, default: null },
    workRightsStatus: {
      type: String,
      enum: ['unverified', 'verified', 'failed'],
      default: 'unverified',
    },
    workRightsLastCheckedAt: { type: Date, default: null },
    
    // Nepal (Phase 1)
    citizenshipCertNumber: { type: String, default: null },
    citizenshipIssuedDistrict: { type: String, default: null },
    citizenshipIssuedDate: { type: Date, default: null },
    citizenshipDocFrontUrl: { type: String, default: null },
    citizenshipDocBackUrl: { type: String, default: null },
    nationalIdNumber: { type: String, default: null },
    panNepal: { type: String, default: null },
    ssfNumber: { type: String, default: null },
    
    // NZ (schema-complete, UI deferred)
    irdNumber: { type: String, default: null },
    taxCodeNZ: { type: String, default: null },
    kiwiSaverOptIn: { type: Boolean, default: null },
    kiwiSaverFund: { type: String, default: null },
    kiwiSaverContributionRate: { type: Number, default: null },
    
    // India (schema-complete, UI deferred)
    aadhaarNumber: { type: String, default: null },
    aadhaarVerified: { type: Boolean, default: false },
    aadhaarVerifiedAt: { type: Date, default: null },
    panNumber: { type: String, default: null },
    panVerified: { type: Boolean, default: false },
    panVerifiedAt: { type: Date, default: null },
    uanNumber: { type: String, default: null },
    esiEligible: { type: Boolean, default: false },
    
    wwcStatus: {
      type: String,
      enum: ['not_required', 'pending', 'active', 'expired'],
      default: 'not_required',
    },
    wwcNumber: String,
    wwcExpiryDate: Date,
    policeClearanceStatus: {
      type: String,
      enum: ['pending', 'active', 'expired'],
    },
    policeClearanceNumber: String,
    policeClearanceExpiryDate: Date,
    foodHandlingStatus: {
      type: String,
      enum: ['current', 'expired'],
    },
    foodHandlingExpiryDate: Date,
    healthSafetyCertifications: [String],
    inductionCompleted: {
      type: Boolean,
      default: false,
    },
    inductionDate: Date,
    inductionDocUrl: String,
    codeOfConductSigned: {
      type: Boolean,
      default: false,
    },
    codeOfConductDate: Date,
    codeOfConductDocUrl: String,
    lastComplianceCheckDate: Date,
  },
  {
    timestamps: true,
    collection: 'employee_compliance',
  }
)

employeeComplianceSchema.index({ wwcStatus: 1 })
employeeComplianceSchema.index({ wwcExpiryDate: 1 }, { sparse: true })
employeeComplianceSchema.index({ policeClearanceExpiryDate: 1 }, { sparse: true })
// One compliance record per employee per tenant
employeeComplianceSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true })

export const EmployeeCompliance =
  (mongoose.models.EmployeeCompliance as mongoose.Model<IEmployeeCompliance>) ??
  mongoose.model<IEmployeeCompliance>('EmployeeCompliance', employeeComplianceSchema)

export default EmployeeCompliance
