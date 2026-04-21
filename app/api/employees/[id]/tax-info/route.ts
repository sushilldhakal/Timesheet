import { z } from 'zod'
import { getAuthWithUserLocations } from '@/lib/auth/auth-api'
import { getEmployeeFromCookie } from '@/lib/auth/auth-helpers'
import { createApiRoute } from '@/lib/api/create-api-route'
import { errorResponseSchema } from '@/lib/validations/auth'
import { apiErrors } from '@/lib/api/api-error'
import { employeeTaxInfoService } from '@/lib/services/employee/employee-tax-info-service'
import { connectDB, Employee } from '@/lib/db'
import { EmployeeTaxInfo } from '@/lib/db/schemas/employee-tax-info'
import { getBankSchema, getCountryConfig, getTaxSchema, type CountryCode } from '@/lib/config/countries'
import { encryptTaxData, extractLast4, getMaskedBankRouting, getMaskedTaxId } from '@/lib/utils/tax-encryption'
import { EmployeeSelfAuditLog } from '@/lib/db/schemas/employee-self-audit-log'

const employeeIdParamSchema = z.object({ id: z.string() })

const createTaxInfoSchema = z.object({
  countrySnapshot: z.enum(['AU', 'IN', 'NP', 'UK', 'SG', 'NZ', 'US', 'CA']),
  taxData: z.record(z.string(), z.any()),
  bankData: z.record(z.string(), z.any()),
})

const taxInfoResponseSchema = z.object({
  taxInfo: z.object({
    id: z.string(),
    countrySnapshot: z.string(),
    taxIdMasked: z.string(),
    taxIdType: z.string(),
    bankAccountMasked: z.string(),
    bankRoutingMasked: z.string(),
    bankRoutingType: z.string(),
    bankAccountName: z.string(),
    bankName: z.string().nullable(),
    bankAccountType: z.string().nullable().optional(),
    countryName: z.string(),
    currency: z.string(),
  }),
})

function buildMaskedResponse(taxInfo: any) {
  const countryConfig = getCountryConfig(taxInfo.countrySnapshot as CountryCode)
  return {
    id: String(taxInfo._id),
    countrySnapshot: taxInfo.countrySnapshot,
    taxIdMasked: getMaskedTaxId(taxInfo.taxId.type, taxInfo.taxId.last4 || ''),
    taxIdType: taxInfo.taxId.type,
    bankAccountMasked: `••••${taxInfo.bank.accountLast4}`,
    bankRoutingMasked: getMaskedBankRouting(taxInfo.bank.routing.type, taxInfo.bank.routing.last4 || ''),
    bankRoutingType: taxInfo.bank.routing.type,
    bankAccountName: taxInfo.bank.accountName,
    bankName: taxInfo.bank.bankName || null,
    bankAccountType: taxInfo.bank.accountType || null,
    countryName: countryConfig.name,
    currency: countryConfig.currency,
  }
}

/** GET /api/employees/[id]/tax-info
 * Allowed: admin/manager/supervisor/super_admin OR the employee themselves */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/{id}/tax-info',
  summary: 'Get employee tax information',
  description: 'Fetch tax and bank details for an employee. All sensitive data is masked.',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: { params: employeeIdParamSchema },
  responses: {
    200: taxInfoResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    if (!params) throw apiErrors.badRequest('Employee ID is required')

    // Try admin auth first
    const ctx = await getAuthWithUserLocations()
    if (ctx) {
      const data = await employeeTaxInfoService.getTaxInfo(ctx, params.id)
      return { status: 200, data }
    }

    // Fall back: allow employee to view their own record
    const employee = await getEmployeeFromCookie()
    if (employee && employee.sub === params.id) {
      await connectDB()
      const emp = await Employee.findById(employee.sub).select('tenantId').lean()
      if (!emp) throw apiErrors.notFound('Employee not found')
      const taxInfo = await EmployeeTaxInfo.findOne({ employeeId: emp._id, tenantId: (emp as any).tenantId }).lean()
      if (!taxInfo) throw apiErrors.notFound('Tax info not found for this employee')
      return { status: 200, data: { taxInfo: buildMaskedResponse(taxInfo) } }
    }

    throw apiErrors.unauthorized()
  },
})

/** POST /api/employees/[id]/tax-info — admin only */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/{id}/tax-info',
  summary: 'Create employee tax information',
  description: 'Add tax and bank details for an employee (country-specific, encrypted)',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: createTaxInfoSchema,
  },
  responses: {
    200: taxInfoResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) throw apiErrors.unauthorized()
    if (!params || !body) throw apiErrors.badRequest('Employee ID and body required')
    const data = await employeeTaxInfoService.createTaxInfo(ctx, params.id, body)
    return { status: 200, data }
  },
})

/** PATCH /api/employees/[id]/tax-info
 * Admin: can update everything.
 * Employee (own record): can update everything EXCEPT tfn. */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/tax-info',
  summary: 'Update employee tax information',
  description: 'Update tax and/or bank details for an employee. Employees cannot change their own TFN.',
  tags: ['Employee Payroll'],
  security: 'adminAuth',
  request: {
    params: employeeIdParamSchema,
    body: createTaxInfoSchema.partial(),
  },
  responses: {
    200: taxInfoResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body, req }) => {
    if (!params || !body) throw apiErrors.badRequest('Employee ID and body required')

    // Try admin auth first
    const ctx = await getAuthWithUserLocations()
    if (ctx) {
      const data = await employeeTaxInfoService.updateTaxInfo(ctx, params.id, body)
      return { status: 200, data }
    }

    // Employee can update their own record — but NOT the TFN
    const employee = await getEmployeeFromCookie()
    if (employee && employee.sub === params.id) {
      await connectDB()
      const emp = await Employee.findById(employee.sub).select('tenantId').lean()
      if (!emp) throw apiErrors.notFound('Employee not found')
      const tenantId = (emp as any).tenantId
      const existing = await EmployeeTaxInfo.findOne({ employeeId: emp._id, tenantId })
      if (!existing) throw apiErrors.notFound('Tax info not found for this employee')

      const countrySnapshot = (body.countrySnapshot || (existing as any).countrySnapshot) as CountryCode
      const countryConfig = getCountryConfig(countrySnapshot)

      const updates: Record<string, unknown> = {}

      if (body.taxData) {
        const rawTaxData = { ...(body.taxData as Record<string, unknown>) }
        // Prevent self-updating TFN / tax id
        delete (rawTaxData as any).taxId
        delete (rawTaxData as any).tfn
        if (Object.keys(rawTaxData).length > 0) {
          const taxSchema = getTaxSchema(countrySnapshot)
          const validatedTaxData = taxSchema.parse({ ...(existing as any).tax.data, ...rawTaxData }) as any
          updates['tax'] = { type: countrySnapshot, version: '2024', data: validatedTaxData }
        }
      }

      if (body.bankData) {
        const bankSchema = getBankSchema(countrySnapshot)
        const validatedBankData = bankSchema.parse(body.bankData) as any

        let routingValue = ''
        let routingType = ''
        if (validatedBankData.bsb) {
          routingValue = validatedBankData.bsb
          routingType = 'bsb'
        } else if (validatedBankData.ifsc) {
          routingValue = validatedBankData.ifsc
          routingType = 'ifsc'
        } else if (validatedBankData.iban) {
          routingValue = validatedBankData.iban
          routingType = 'iban'
        } else if (validatedBankData.routingNumber) {
          routingValue = validatedBankData.routingNumber
          routingType = 'routing'
        } else if (validatedBankData.transitNumber) {
          routingValue = `${validatedBankData.transitNumber}-${validatedBankData.institutionNumber}`
          routingType = 'routing'
        }

        updates['bank'] = {
          accountName: validatedBankData.accountName,
          accountNumberEncrypted: encryptTaxData(validatedBankData.accountNumber),
          accountLast4: extractLast4(validatedBankData.accountNumber),
          routing: {
            type: routingType || countryConfig.bankRoutingTypes[0] || 'swift',
            valueEncrypted: routingValue ? encryptTaxData(routingValue) : encryptTaxData('N/A'),
            last4: routingValue ? extractLast4(routingValue) : '0000',
          },
          bankName: validatedBankData.bankName,
          swiftCode: validatedBankData.swiftCode,
          accountType: validatedBankData.accountType,
        }
      }

      if (body.countrySnapshot) updates['countrySnapshot'] = body.countrySnapshot

      const updated = await EmployeeTaxInfo.findByIdAndUpdate((existing as any)._id, { $set: updates }, { new: true }).lean()
      if (!updated) throw apiErrors.notFound('Failed to update tax info')

      try {
        await EmployeeSelfAuditLog.create({
          tenantId,
          employeeId: emp._id,
          action: 'UPDATE_PAYROLL',
          changedFields: Object.keys(updates),
          ipAddress: req.headers.get('x-forwarded-for') || '',
          userAgent: req.headers.get('user-agent') || '',
        })
      } catch {
        // ignore audit failures
      }

      return { status: 200, data: { taxInfo: buildMaskedResponse(updated) } }
    }

    throw apiErrors.unauthorized()
  },
})
