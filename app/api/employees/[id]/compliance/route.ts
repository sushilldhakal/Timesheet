import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB, Employee, EmployeeCompliance } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  employeeIdParamSchema,
  complianceUpdateSchema,
  complianceResponseSchema,
} from "@/lib/validations/employee-payroll"
import { errorResponseSchema } from "@/lib/validations/auth"

const EXPIRY_WARNING_DAYS = 30

function buildAlerts(compliance: any): Array<{ type: string; field: string; message: string; expiryDate?: string }> {
  const alerts: Array<{ type: string; field: string; message: string; expiryDate?: string }> = []
  const now = new Date()
  const warningThreshold = new Date(now.getTime() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000)

  if (compliance.wwcExpiryDate) {
    const d = new Date(compliance.wwcExpiryDate)
    if (d < now) {
      alerts.push({ type: 'expired', field: 'wwc', message: 'Working with Children Check has expired', expiryDate: d.toISOString() })
    } else if (d < warningThreshold) {
      alerts.push({ type: 'expiring_soon', field: 'wwc', message: 'Working with Children Check expires within 30 days', expiryDate: d.toISOString() })
    }
  }

  if (compliance.policeClearanceExpiryDate) {
    const d = new Date(compliance.policeClearanceExpiryDate)
    if (d < now) {
      alerts.push({ type: 'expired', field: 'policeClearance', message: 'Police clearance has expired', expiryDate: d.toISOString() })
    } else if (d < warningThreshold) {
      alerts.push({ type: 'expiring_soon', field: 'policeClearance', message: 'Police clearance expires within 30 days', expiryDate: d.toISOString() })
    }
  }

  if (compliance.foodHandlingExpiryDate) {
    const d = new Date(compliance.foodHandlingExpiryDate)
    if (d < now) {
      alerts.push({ type: 'expired', field: 'foodHandling', message: 'Food handling certificate has expired', expiryDate: d.toISOString() })
    } else if (d < warningThreshold) {
      alerts.push({ type: 'expiring_soon', field: 'foodHandling', message: 'Food handling certificate expires within 30 days', expiryDate: d.toISOString() })
    }
  }

  if (!compliance.inductionCompleted) {
    alerts.push({ type: 'missing', field: 'induction', message: 'Induction has not been completed' })
  }

  if (!compliance.codeOfConductSigned) {
    alerts.push({ type: 'missing', field: 'codeOfConduct', message: 'Code of conduct has not been signed' })
  }

  return alerts
}

function formatCompliance(c: any) {
  return {
    id: String(c._id),
    employeeId: String(c.employeeId),
    wwcStatus: c.wwcStatus || null,
    wwcNumber: c.wwcNumber || null,
    wwcExpiryDate: c.wwcExpiryDate?.toISOString() ?? null,
    policeClearanceStatus: c.policeClearanceStatus || null,
    policeClearanceNumber: c.policeClearanceNumber || null,
    policeClearanceExpiryDate: c.policeClearanceExpiryDate?.toISOString() ?? null,
    foodHandlingStatus: c.foodHandlingStatus || null,
    foodHandlingExpiryDate: c.foodHandlingExpiryDate?.toISOString() ?? null,
    healthSafetyCertifications: c.healthSafetyCertifications || [],
    inductionCompleted: c.inductionCompleted ?? false,
    inductionDate: c.inductionDate?.toISOString() ?? null,
    inductionDocUrl: c.inductionDocUrl || null,
    codeOfConductSigned: c.codeOfConductSigned ?? false,
    codeOfConductDate: c.codeOfConductDate?.toISOString() ?? null,
    codeOfConductDocUrl: c.codeOfConductDocUrl || null,
    lastComplianceCheckDate: c.lastComplianceCheckDate?.toISOString() ?? null,
    alerts: buildAlerts(c),
  }
}

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/compliance',
  summary: 'Get employee compliance record',
  description: 'Fetch compliance record for an employee, including alerts for expiring certifications',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema },
  responses: {
    200: complianceResponseSchema,
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

      let compliance = await EmployeeCompliance.findOne({ employeeId: params.id }).lean()

      if (!compliance) {
        const created = await EmployeeCompliance.create({ employeeId: params.id })
        compliance = created.toObject()
      }

      return {
        status: 200,
        data: { compliance: formatCompliance(compliance) },
      }
    } catch (err) {
      console.error("[api/employees/[id]/compliance GET]", err)
      return { status: 500, data: { error: "Failed to fetch compliance record" } }
    }
  },
})

export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/compliance',
  summary: 'Update employee compliance record',
  description: 'Update compliance fields for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: complianceUpdateSchema },
  responses: {
    200: complianceResponseSchema,
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
      const dateFields = [
        'wwcExpiryDate', 'policeClearanceExpiryDate', 'foodHandlingExpiryDate',
        'inductionDate', 'codeOfConductDate', 'lastComplianceCheckDate',
      ] as const

      for (const [key, value] of Object.entries(body)) {
        if (dateFields.includes(key as any) && value) {
          updates[key] = new Date(value as string)
        } else {
          updates[key] = value
        }
      }

      const compliance = await EmployeeCompliance.findOneAndUpdate(
        { employeeId: params.id },
        { $set: updates },
        { new: true, runValidators: true, upsert: true }
      ).lean()

      return {
        status: 200,
        data: { compliance: formatCompliance(compliance) },
      }
    } catch (err) {
      console.error("[api/employees/[id]/compliance PATCH]", err)
      return { status: 500, data: { error: "Failed to update compliance record" } }
    }
  },
})
