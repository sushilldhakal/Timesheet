import mongoose from "mongoose"

export interface IEmployeeAwardAssignment {
  tenantId: mongoose.Types.ObjectId
  employeeId: mongoose.Types.ObjectId
  awardId: mongoose.Types.ObjectId
  priority: number
  validFrom: Date
  validTo?: Date
  isActive: boolean
  notes?: string
  assignedBy: mongoose.Types.ObjectId
  assignedAt: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface IEmployeeAwardAssignmentDocument extends IEmployeeAwardAssignment, mongoose.Document {}

const employeeAwardAssignmentSchema = new mongoose.Schema<IEmployeeAwardAssignmentDocument>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    awardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Award",
      required: true,
    },
    priority: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
    collection: "employee_award_assignments",
  }
)

employeeAwardAssignmentSchema.index({ tenantId: 1, employeeId: 1, isActive: 1 })
employeeAwardAssignmentSchema.index({ tenantId: 1, employeeId: 1, validFrom: 1, validTo: 1 })
employeeAwardAssignmentSchema.index({ tenantId: 1, awardId: 1 })

export const EmployeeAwardAssignment =
  (mongoose.models.EmployeeAwardAssignment as mongoose.Model<IEmployeeAwardAssignmentDocument>) ??
  mongoose.model<IEmployeeAwardAssignmentDocument>(
    "EmployeeAwardAssignment",
    employeeAwardAssignmentSchema
  )
