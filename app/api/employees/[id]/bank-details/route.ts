import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB, Employee, EmployeeBankDetails } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  employeeIdParamSchema,
  bankDetailsBodySchema,
  bankDetailsUpdateSchema,
  bankDetailsResponseSchema,
} from "@/lib/validations/employee-payroll"
import { errorResponseSchema } from "@/lib/validations/auth"

function maskAccount(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return '****'
  return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4)
}

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/bank-details',
  summary: 'Get employee bank details',
  description: 'Fetch bank details for an employee. Account number is masked (last 4 digits only).',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema },
  responses: {
    200: bankDetailsResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params) return { status: 400, data: { error: "Employee ID is required" } }

    try {
      await connectDB()
      const employee = await Employee.findById(params.id).lean()
      if (!employee) return { status: 404, data: { error: "Employee not found" } }

      const bankDetails = await EmployeeBankDetails.findOne({ employeeId: params.id }).lean()
      if (!bankDetails) return { status: 404, data: { error: "Bank details not found for this employee" } }

      return {
        status: 200,
        data: {
          bankDetails: {
            id: String(bankDetails._id),
            employeeId: String(bankDetails.employeeId),
            accountNumber: maskAccount(bankDetails.accountNumber),
            bsbCode: bankDetails.bsbCode,
            accountHolderName: bankDetails.accountHolderName,
            bankName: bankDetails.bankName || null,
            accountType: bankDetails.accountType || null,
          },
        },
      }
    } catch (err) {
      console.error("[api/employees/[id]/bank-details GET]", err)
      return { status: 500, data: { error: "Failed to fetch bank details" } }
    }
  },
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/bank-details',
  summary: 'Create employee bank details',
  description: 'Create bank details for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: bankDetailsBodySchema },
  responses: {
    201: bankDetailsResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }

    try {
      await connectDB()
      const employee = await Employee.findById(params.id).lean()
      if (!employee) return { status: 404, data: { error: "Employee not found" } }

      const existing = await EmployeeBankDetails.findOne({ employeeId: params.id })
      if (existing) return { status: 409, data: { error: "Bank details already exist. Use PATCH to update." } }

      const bankDetails = await EmployeeBankDetails.create({
        employeeId: params.id,
        ...body,
      })

      await Employee.findByIdAndUpdate(params.id, { bankDetailsId: bankDetails._id })

      return {
        status: 201 as any,
        data: {
          bankDetails: {
            id: String(bankDetails._id),
            employeeId: String(bankDetails.employeeId),
            accountNumber: maskAccount(bankDetails.accountNumber),
            bsbCode: bankDetails.bsbCode,
            accountHolderName: bankDetails.accountHolderName,
            bankName: bankDetails.bankName || null,
            accountType: bankDetails.accountType || null,
          },
        },
      }
    } catch (err) {
      console.error("[api/employees/[id]/bank-details POST]", err)
      return { status: 500, data: { error: "Failed to create bank details" } }
    }
  },
})

export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/bank-details',
  summary: 'Update employee bank details',
  description: 'Update bank details for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: bankDetailsUpdateSchema },
  responses: {
    200: bankDetailsResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }

    try {
      await connectDB()

      const bankDetails = await EmployeeBankDetails.findOneAndUpdate(
        { employeeId: params.id },
        { $set: body },
        { new: true, runValidators: true }
      ).lean()

      if (!bankDetails) return { status: 404, data: { error: "Bank details not found for this employee" } }

      return {
        status: 200,
        data: {
          bankDetails: {
            id: String(bankDetails._id),
            employeeId: String(bankDetails.employeeId),
            accountNumber: maskAccount(bankDetails.accountNumber),
            bsbCode: bankDetails.bsbCode,
            accountHolderName: bankDetails.accountHolderName,
            bankName: bankDetails.bankName || null,
            accountType: bankDetails.accountType || null,
          },
        },
      }
    } catch (err) {
      console.error("[api/employees/[id]/bank-details PATCH]", err)
      return { status: 500, data: { error: "Failed to update bank details" } }
    }
  },
})
