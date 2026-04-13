import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB, Employee, EmployeeContract } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  employeeIdParamSchema,
  contractBodySchema,
  contractUpdateSchema,
  contractResponseSchema,
  contractListResponseSchema,
} from "@/lib/validations/employee-payroll"
import { errorResponseSchema } from "@/lib/validations/auth"

function formatContract(c: any) {
  return {
    id: String(c._id),
    employeeId: String(c.employeeId),
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    contractType: c.contractType,
    noticePeriod: c.noticePeriod ?? null,
    probationPeriodEnd: c.probationPeriodEnd?.toISOString() ?? null,
    contractTermsUrl: c.contractTermsUrl || null,
    salary: c.salary ?? null,
    wageType: c.wageType,
    isActive: c.isActive,
  }
}

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/contract',
  summary: 'Get employee contracts',
  description: 'Fetch all contracts for an employee (most recent first)',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema },
  responses: {
    200: contractListResponseSchema,
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

      const contracts = await EmployeeContract.find({ employeeId: params.id })
        .sort({ startDate: -1 })
        .lean()

      return {
        status: 200,
        data: { contracts: contracts.map(formatContract) },
      }
    } catch (err) {
      console.error("[api/employees/[id]/contract GET]", err)
      return { status: 500, data: { error: "Failed to fetch contracts" } }
    }
  },
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/contract',
  summary: 'Create employee contract',
  description: 'Create a new contract for an employee. Deactivates any existing active contract.',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: contractBodySchema },
  responses: {
    201: contractResponseSchema,
    400: errorResponseSchema,
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
      const employee = await Employee.findById(params.id).lean()
      if (!employee) return { status: 404, data: { error: "Employee not found" } }

      // Deactivate existing active contracts
      await EmployeeContract.updateMany(
        { employeeId: params.id, isActive: true },
        { $set: { isActive: false } }
      )

      const contract = await EmployeeContract.create({
        employeeId: params.id,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        contractType: body.contractType,
        noticePeriod: body.noticePeriod,
        probationPeriodEnd: body.probationPeriodEnd ? new Date(body.probationPeriodEnd) : undefined,
        contractTermsUrl: body.contractTermsUrl,
        salary: body.salary,
        wageType: body.wageType,
        isActive: true,
      })

      // Update employee reference to the new active contract
      const updateFields: Record<string, unknown> = { contractId: contract._id }
      if (body.probationPeriodEnd) {
        updateFields.isProbationary = true
        updateFields.probationEndDate = new Date(body.probationPeriodEnd)
      }
      await Employee.findByIdAndUpdate(params.id, updateFields)

      return {
        status: 201 as any,
        data: { contract: formatContract(contract) },
      }
    } catch (err) {
      console.error("[api/employees/[id]/contract POST]", err)
      return { status: 500, data: { error: "Failed to create contract" } }
    }
  },
})

export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/contract',
  summary: 'Update active employee contract',
  description: 'Update the currently active contract for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: contractUpdateSchema },
  responses: {
    200: contractResponseSchema,
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

      const updates: Record<string, unknown> = {}
      if (body.startDate) updates.startDate = new Date(body.startDate)
      if (body.endDate !== undefined) updates.endDate = body.endDate ? new Date(body.endDate) : null
      if (body.contractType) updates.contractType = body.contractType
      if (body.noticePeriod !== undefined) updates.noticePeriod = body.noticePeriod
      if (body.probationPeriodEnd !== undefined) updates.probationPeriodEnd = body.probationPeriodEnd ? new Date(body.probationPeriodEnd) : null
      if (body.contractTermsUrl !== undefined) updates.contractTermsUrl = body.contractTermsUrl
      if (body.salary !== undefined) updates.salary = body.salary
      if (body.wageType) updates.wageType = body.wageType
      if (body.isActive !== undefined) updates.isActive = body.isActive

      const contract = await EmployeeContract.findOneAndUpdate(
        { employeeId: params.id, isActive: true },
        { $set: updates },
        { new: true, runValidators: true }
      ).lean()

      if (!contract) return { status: 404, data: { error: "No active contract found for this employee" } }

      return {
        status: 200,
        data: { contract: formatContract(contract) },
      }
    } catch (err) {
      console.error("[api/employees/[id]/contract PATCH]", err)
      return { status: 500, data: { error: "Failed to update contract" } }
    }
  },
})
