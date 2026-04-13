import { z } from "zod"
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB, Employee, EmployeeQualification } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  employeeIdParamSchema,
  qualificationBodySchema,
  qualificationUpdateSchema,
  qualificationListResponseSchema,
  qualificationResponseSchema,
} from "@/lib/validations/employee-payroll"
import { errorResponseSchema } from "@/lib/validations/auth"

function computeStatus(expiryDate?: Date | null): 'current' | 'expired' | 'pending' {
  if (!expiryDate) return 'current'
  return new Date(expiryDate) < new Date() ? 'expired' : 'current'
}

function formatQualification(q: any) {
  return {
    id: String(q._id),
    employeeId: String(q.employeeId),
    qualificationName: q.qualificationName,
    issuingBody: q.issuingBody,
    issueDate: q.issueDate?.toISOString() ?? null,
    expiryDate: q.expiryDate?.toISOString() ?? null,
    licenseNumber: q.licenseNumber || null,
    status: q.status,
    documentUrl: q.documentUrl || null,
  }
}

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/qualifications',
  summary: 'List employee qualifications',
  description: 'Fetch all qualifications/certifications for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema },
  responses: {
    200: qualificationListResponseSchema,
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

      const qualifications = await EmployeeQualification.find({ employeeId: params.id })
        .sort({ issueDate: -1 })
        .lean()

      return {
        status: 200,
        data: { qualifications: qualifications.map(formatQualification) },
      }
    } catch (err) {
      console.error("[api/employees/[id]/qualifications GET]", err)
      return { status: 500, data: { error: "Failed to fetch qualifications" } }
    }
  },
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/qualifications',
  summary: 'Add employee qualification',
  description: 'Add a new qualification or certification for an employee',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema, body: qualificationBodySchema },
  responses: {
    201: qualificationResponseSchema,
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

      const expiryDate = body.expiryDate ? new Date(body.expiryDate) : undefined
      const status = body.status || computeStatus(expiryDate)

      const qualification = await EmployeeQualification.create({
        employeeId: params.id,
        qualificationName: body.qualificationName,
        issuingBody: body.issuingBody,
        issueDate: new Date(body.issueDate),
        expiryDate,
        licenseNumber: body.licenseNumber,
        status,
        documentUrl: body.documentUrl,
      })

      return {
        status: 201 as any,
        data: { qualification: formatQualification(qualification) },
      }
    } catch (err) {
      console.error("[api/employees/[id]/qualifications POST]", err)
      return { status: 500, data: { error: "Failed to add qualification" } }
    }
  },
})

export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/qualifications',
  summary: 'Update employee qualification',
  description: 'Update a specific qualification by qualificationId (passed in body)',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: qualificationUpdateSchema.extend({
      qualificationId: z.string(),
    }),
  },
  responses: {
    200: qualificationResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params || !body) return { status: 400, data: { error: "Employee ID and body required" } }

    const { qualificationId, ...updateData } = body as any

    if (!qualificationId) return { status: 400, data: { error: "qualificationId is required" } }

    try {
      await connectDB()

      const updates: Record<string, unknown> = {}
      if (updateData.qualificationName) updates.qualificationName = updateData.qualificationName
      if (updateData.issuingBody) updates.issuingBody = updateData.issuingBody
      if (updateData.issueDate) updates.issueDate = new Date(updateData.issueDate)
      if (updateData.expiryDate !== undefined) {
        updates.expiryDate = updateData.expiryDate ? new Date(updateData.expiryDate) : null
        if (!updateData.status) {
          updates.status = computeStatus(updateData.expiryDate ? new Date(updateData.expiryDate) : null)
        }
      }
      if (updateData.licenseNumber !== undefined) updates.licenseNumber = updateData.licenseNumber
      if (updateData.status) updates.status = updateData.status
      if (updateData.documentUrl !== undefined) updates.documentUrl = updateData.documentUrl

      const qualification = await EmployeeQualification.findOneAndUpdate(
        { _id: qualificationId, employeeId: params.id },
        { $set: updates },
        { new: true, runValidators: true }
      ).lean()

      if (!qualification) return { status: 404, data: { error: "Qualification not found" } }

      return {
        status: 200,
        data: { qualification: formatQualification(qualification) },
      }
    } catch (err) {
      console.error("[api/employees/[id]/qualifications PATCH]", err)
      return { status: 500, data: { error: "Failed to update qualification" } }
    }
  },
})

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/employees/{id}/qualifications',
  summary: 'Remove employee qualification',
  description: 'Delete a qualification by qualificationId (passed as query param)',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    query: z.object({ qualificationId: z.string() }),
  },
  responses: {
    200: z.object({ success: z.boolean() }),
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } }
    if (!params) return { status: 400, data: { error: "Employee ID is required" } }

    const qualificationId = (query as any)?.qualificationId
    if (!qualificationId) return { status: 400, data: { error: "qualificationId query param required" } }

    try {
      await connectDB()

      const deleted = await EmployeeQualification.findOneAndDelete({
        _id: qualificationId,
        employeeId: params.id,
      })

      if (!deleted) return { status: 404, data: { error: "Qualification not found" } }

      return { status: 200, data: { success: true } }
    } catch (err) {
      console.error("[api/employees/[id]/qualifications DELETE]", err)
      return { status: 500, data: { error: "Failed to delete qualification" } }
    }
  },
})
