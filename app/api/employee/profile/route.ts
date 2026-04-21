import { z } from 'zod'
import { getEmployeeFromCookie } from '@/lib/auth/auth-helpers'
import { createApiRoute } from '@/lib/api/create-api-route'
import { connectDB, Employee } from '@/lib/db'
import { EmployeeSelfAuditLog } from '@/lib/db/schemas/employee-self-audit-log'
import { errorResponseSchema } from '@/lib/validations/auth'

const updateEmployeeProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
  }).partial().optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
  }).partial().optional(),
})

const updateEmployeeProfileResponseSchema = z.object({
  success: z.boolean(),
})

export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employee/profile',
  summary: 'Update own profile',
  description: 'Update safe personal fields for the currently authenticated employee',
  tags: ['Employee'],
  security: 'employeeAuth',
  request: { body: updateEmployeeProfileSchema },
  responses: {
    200: updateEmployeeProfileResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body, req }) => {
    const employeeAuth = await getEmployeeFromCookie()
    if (!employeeAuth) return { status: 401, data: { error: 'Not authenticated' } }
    if (!body) return { status: 400, data: { error: 'Request body is required' } }

    await connectDB()

    const existing = await Employee.findById(employeeAuth.sub).lean()
    if (!existing) return { status: 404, data: { error: 'Employee not found' } }

    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.email !== undefined) updates.email = body.email.trim().toLowerCase()
    if (body.phone !== undefined) updates.phone = String(body.phone || '').trim()
    if (body.address) {
      updates.address = {
        ...(existing as any).address,
        ...body.address,
      }
      const addr = updates.address as any
      const homeAddress = [addr?.line1, addr?.line2, `${addr?.city || ''} ${addr?.state || ''} ${addr?.postcode || ''}`.trim(), addr?.country]
        .filter((p) => String(p || '').trim())
        .join(', ')
      updates.homeAddress = homeAddress
    }
    if (body.emergencyContact) {
      updates.emergencyContact = {
        ...(existing as any).emergencyContact,
        ...body.emergencyContact,
      }
    }

    if (Object.keys(updates).length === 0) return { status: 200, data: { success: true } }

    await Employee.findByIdAndUpdate(employeeAuth.sub, { $set: updates }, { runValidators: true })

    try {
      await EmployeeSelfAuditLog.create({
        tenantId: (existing as any).tenantId,
        employeeId: (existing as any)._id,
        action: 'UPDATE_PROFILE',
        changedFields: Object.keys(updates),
        ipAddress: req.headers.get('x-forwarded-for') || '',
        userAgent: req.headers.get('user-agent') || '',
      })
    } catch {
      // ignore audit failures
    }

    return { status: 200, data: { success: true } }
  },
})
