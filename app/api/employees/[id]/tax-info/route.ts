import { z } from 'zod'
import { getAuthWithUserLocations } from '@/lib/auth/auth-api'
import { connectDB, mongoose, EmployeeTaxInfo, Employee } from '@/lib/db'
import { getCountryConfig, getTaxSchema, getBankSchema, type CountryCode } from '@/lib/config/countries'
import { encryptTaxData, extractLast4, getMaskedTaxId, getMaskedBankRouting } from '@/lib/utils/tax-encryption'
import { createApiRoute } from '@/lib/api/create-api-route'
import { errorResponseSchema } from '@/lib/validations/auth'

const employeeIdParamSchema = z.object({ id: z.string() })

const createTaxInfoSchema = z.object({
  countrySnapshot: z.enum(['AU', 'IN', 'NP', 'UK', 'SG', 'NZ', 'US', 'CA']),
  taxData: z.record(z.any()),
  bankData: z.record(z.any()),
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
    countryName: z.string(),
    currency: z.string(),
  }),
})

function buildMaskedResponse(taxInfo: any, countryConfig: any) {
  return {
    id: taxInfo._id.toString(),
    countrySnapshot: taxInfo.countrySnapshot,
    taxIdMasked: getMaskedTaxId(taxInfo.taxId.type, taxInfo.taxId.last4 || ''),
    taxIdType: taxInfo.taxId.type,
    bankAccountMasked: `••••${taxInfo.bank.accountLast4}`,
    bankRoutingMasked: getMaskedBankRouting(taxInfo.bank.routing.type, taxInfo.bank.routing.last4 || ''),
    bankRoutingType: taxInfo.bank.routing.type,
    bankAccountName: taxInfo.bank.accountName,
    bankName: taxInfo.bank.bankName || null,
    countryName: countryConfig.name,
    currency: countryConfig.currency,
  }
}

/** GET /api/employees/[id]/tax-info */
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
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: 'Unauthorized' } }
    if (!params) return { status: 400, data: { error: 'Employee ID is required' } }

    try {
      await connectDB()
      const employee = await Employee.findById(params.id).lean()
      if (!employee) return { status: 404, data: { error: 'Employee not found' } }

      const taxInfo = await EmployeeTaxInfo.findOne({
        employeeId: params.id,
        tenantId: ctx.tenantId,
      }).lean()

      if (!taxInfo) return { status: 404, data: { error: 'Tax info not found for this employee' } }

      // Log the access
      await EmployeeTaxInfo.updateOne(
        { _id: taxInfo._id },
        {
          $push: {
            accessLogs: {
              userId: new mongoose.Types.ObjectId(ctx.auth.sub),
              action: 'VIEW_TAX',
              timestamp: new Date(),
            },
          },
        }
      )

      const countryConfig = getCountryConfig(taxInfo.countrySnapshot as CountryCode)

      return {
        status: 200,
        data: { taxInfo: buildMaskedResponse(taxInfo, countryConfig) },
      }
    } catch (err) {
      console.error('[api/employees/[id]/tax-info GET]', err)
      return { status: 500, data: { error: 'Failed to fetch tax info' } }
    }
  },
})

/** POST /api/employees/[id]/tax-info */
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
    if (!ctx) return { status: 401, data: { error: 'Unauthorized' } }
    if (!params || !body) return { status: 400, data: { error: 'Employee ID and body required' } }

    const { id: employeeId } = params
    const { countrySnapshot, taxData, bankData } = body

    try {
      await connectDB()

      const employee = await Employee.findById(employeeId).lean()
      if (!employee) return { status: 404, data: { error: 'Employee not found' } }

      // Check for existing record
      const existing = await EmployeeTaxInfo.findOne({
        employeeId,
        tenantId: ctx.tenantId,
      })
      if (existing) {
        return { status: 409, data: { error: 'Tax info already exists for this employee. Use PATCH to update.' } }
      }

      // Get country config (single source of truth)
      const countryConfig = getCountryConfig(countrySnapshot as CountryCode)

      // Validate tax data against country schema
      const taxSchema = getTaxSchema(countrySnapshot as CountryCode)
      let validatedTaxData
      try {
        validatedTaxData = taxSchema.parse(taxData)
      } catch (e) {
        return {
          status: 400,
          data: { error: `Tax validation failed: ${(e as Error).message}` },
        }
      }

      // Validate bank data against country schema
      const bankSchema = getBankSchema(countrySnapshot as CountryCode)
      let validatedBankData
      try {
        validatedBankData = bankSchema.parse(bankData)
      } catch (e) {
        return {
          status: 400,
          data: { error: `Bank validation failed: ${(e as Error).message}` },
        }
      }

      // Extract the primary tax ID value from validated data
      const taxIdValue =
        validatedTaxData.taxId ||
        validatedTaxData.pan ||
        validatedTaxData.nric ||
        validatedTaxData.ssn ||
        validatedTaxData.sin ||
        validatedTaxData.irdNumber ||
        validatedTaxData.taxCode
      const encryptedTaxId = encryptTaxData(String(taxIdValue))
      const taxIdLast4 = extractLast4(String(taxIdValue))

      // Encrypt account number
      const encryptedAccount = encryptTaxData(validatedBankData.accountNumber)
      const accountLast4 = extractLast4(validatedBankData.accountNumber)

      // Determine routing field based on country
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

      const encryptedRouting = routingValue ? encryptTaxData(routingValue) : encryptTaxData('N/A')
      const routingLast4 = routingValue ? extractLast4(routingValue) : '0000'

      // Create tax info with audit log
      const taxInfo = await EmployeeTaxInfo.create({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        tenantId: new mongoose.Types.ObjectId(ctx.tenantId),
        countrySnapshot,
        taxId: {
          type: countryConfig.taxIdType,
          valueEncrypted: encryptedTaxId,
          last4: taxIdLast4,
        },
        tax: {
          type: countrySnapshot,
          version: '2024',
          data: validatedTaxData,
        },
        bank: {
          accountName: validatedBankData.accountName,
          accountNumberEncrypted: encryptedAccount,
          accountLast4,
          routing: {
            type: routingType || countryConfig.bankRoutingTypes[0] || 'swift',
            valueEncrypted: encryptedRouting,
            last4: routingLast4,
          },
          bankName: validatedBankData.bankName,
          swiftCode: validatedBankData.swiftCode,
        },
        accessLogs: [
          {
            userId: new mongoose.Types.ObjectId(ctx.auth.sub),
            action: 'EDIT_TAX',
            timestamp: new Date(),
          },
        ],
        createdBy: new mongoose.Types.ObjectId(ctx.auth.sub),
      })

      // Update employee reference
      await Employee.findByIdAndUpdate(employeeId, { taxInfoId: taxInfo._id })

      return {
        status: 200,
        data: { taxInfo: buildMaskedResponse(taxInfo, countryConfig) },
      }
    } catch (err) {
      console.error('[api/employees/[id]/tax-info POST]', err)
      return { status: 500, data: { error: 'Failed to create tax info' } }
    }
  },
})

/** PATCH /api/employees/[id]/tax-info */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/employees/{id}/tax-info',
  summary: 'Update employee tax information',
  description: 'Update tax and/or bank details for an employee',
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
  handler: async ({ params, body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) return { status: 401, data: { error: 'Unauthorized' } }
    if (!params || !body) return { status: 400, data: { error: 'Employee ID and body required' } }

    try {
      await connectDB()

      const existing = await EmployeeTaxInfo.findOne({
        employeeId: params.id,
        tenantId: ctx.tenantId,
      })
      if (!existing) return { status: 404, data: { error: 'Tax info not found for this employee' } }

      const countryCode = (body.countrySnapshot || existing.countrySnapshot) as CountryCode
      const countryConfig = getCountryConfig(countryCode)
      const updates: Record<string, unknown> = {}

      // Re-validate and re-encrypt tax data if provided
      if (body.taxData) {
        const taxSchema = getTaxSchema(countryCode)
        let validatedTaxData
        try {
          validatedTaxData = taxSchema.parse(body.taxData)
        } catch (e) {
          return {
            status: 400,
            data: { error: `Tax validation failed: ${(e as Error).message}` },
          }
        }

        const taxIdValue =
          validatedTaxData.taxId ||
          validatedTaxData.pan ||
          validatedTaxData.nric ||
          validatedTaxData.ssn ||
          validatedTaxData.sin ||
          validatedTaxData.irdNumber ||
          validatedTaxData.taxCode

        updates['taxId'] = {
          type: countryConfig.taxIdType,
          valueEncrypted: encryptTaxData(String(taxIdValue)),
          last4: extractLast4(String(taxIdValue)),
        }
        updates['tax'] = {
          type: countryCode,
          version: '2024',
          data: validatedTaxData,
        }
      }

      // Re-validate and re-encrypt bank data if provided
      if (body.bankData) {
        const bankSchema = getBankSchema(countryCode)
        let validatedBankData
        try {
          validatedBankData = bankSchema.parse(body.bankData)
        } catch (e) {
          return {
            status: 400,
            data: { error: `Bank validation failed: ${(e as Error).message}` },
          }
        }

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
        }
      }

      if (body.countrySnapshot) {
        updates['countrySnapshot'] = body.countrySnapshot
      }

      const updated = await EmployeeTaxInfo.findOneAndUpdate(
        { _id: existing._id },
        {
          $set: updates,
          $push: {
            accessLogs: {
              userId: new mongoose.Types.ObjectId(ctx.auth.sub),
              action: 'EDIT_TAX',
              timestamp: new Date(),
            },
          },
        },
        { new: true, runValidators: true }
      ).lean()

      if (!updated) return { status: 404, data: { error: 'Failed to update tax info' } }

      return {
        status: 200,
        data: { taxInfo: buildMaskedResponse(updated, countryConfig) },
      }
    } catch (err) {
      console.error('[api/employees/[id]/tax-info PATCH]', err)
      return { status: 500, data: { error: 'Failed to update tax info' } }
    }
  },
})
