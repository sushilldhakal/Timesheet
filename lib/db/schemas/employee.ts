import mongoose from "mongoose"

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
  createdAt?: Date
  updatedAt?: Date
}

export interface IEmployeeDocument extends IEmployee, mongoose.Document {}

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
  },
  {
    timestamps: true,
    collection: "employees",
  }
)

employeeSchema.index({ pin: 1 })
employeeSchema.index({ site: 1 })

export const Employee =
  (mongoose.models.Employee as mongoose.Model<IEmployeeDocument>) ??
  mongoose.model<IEmployeeDocument>("Employee", employeeSchema)
