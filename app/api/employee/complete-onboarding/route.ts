/**
 * Complete Employee Onboarding API
 * 
 * Handles completion of employee self-onboarding process
 */

import { getEmployeeFromWebCookie } from "@/lib/auth/employee-auth"
import { connectDB, Employee } from "@/lib/db"
import { staffOnboardingFormSchema } from "@/lib/validations/staff-onboarding"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"
import { EmployeeTaxInfo } from "@/lib/db/schemas/employee-tax-info"
import { EmployeeCompliance } from "@/lib/db/schemas/employee-compliance"
import { EmployeeSelfAuditLog } from "@/lib/db/schemas/employee-self-audit-log"
import { getBankSchema, getCountryConfig, getTaxSchema, type CountryCode } from "@/lib/config/countries"
import { encryptTaxData, extractLast4 } from "@/lib/utils/tax-encryption"

const completeOnboardingResponseSchema = z.object({
  message: z.string(),
  employee: z.object({
    id: z.string(),
    name: z.string(),
    onboardingCompleted: z.boolean(),
  })
})

const errorResponseSchema = z.object({
  error: z.string()
})

// POST - Complete employee onboarding
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employee/complete-onboarding',
  summary: 'Complete employee onboarding',
  description: 'Complete the employee self-onboarding process with all required information',
  tags: ['Employee'],
  security: 'employeeAuth',
  request: {
    body: staffOnboardingFormSchema
  },
  responses: {
    200: completeOnboardingResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body, req }) => {
    try {
      const employeeAuth = await getEmployeeFromWebCookie()
      if (!employeeAuth) {
        return {
          status: 401,
          data: { error: "Not authenticated" }
        }
      }

      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        }
      }

      await connectDB()

      // Find the employee
      const employee = await Employee.findById(employeeAuth.sub)
      if (!employee) {
        return {
          status: 404,
          data: { error: "Employee not found" }
        }
      }

      // Check if onboarding is already completed
      if ((employee as any).onboardingCompleted) {
        return {
          status: 400,
          data: { error: "Onboarding already completed" }
        }
      }

      const formatHomeAddress = () => {
        const parts = [
          body.addressLine1,
          body.addressLine2,
          `${body.city} ${body.state} ${body.postcode}`.trim(),
          body.country,
        ].filter((p) => String(p || '').trim())
        return parts.join(', ')
      }

      // --- Create/Upsert encrypted tax + bank info (AU by default) ---
      const countrySnapshot: CountryCode = 'AU'
      const countryConfig = getCountryConfig(countrySnapshot)

      const taxSchema = getTaxSchema(countrySnapshot)
      const bankSchema = getBankSchema(countrySnapshot)

      const validatedTaxData = taxSchema.parse({
        taxId: body.tfn,
        taxFreeThreshold: body.taxFreeThreshold,
        studentLoan: body.hasHelpDebt,
        superannuationFund: body.superannuationFund,
        superannuationMemberNumber: body.superannuationMemberNumber,
      }) as any

      const validatedBankData = bankSchema.parse({
        accountName: body.accountHolderName,
        accountNumber: body.accountNumber,
        bsb: body.bsbCode,
        bankName: body.bankName,
        accountType: body.accountType,
      }) as any

      const encryptedTaxId = encryptTaxData(String(validatedTaxData.taxId))
      const taxIdLast4 = extractLast4(String(validatedTaxData.taxId))

      const encryptedAccount = encryptTaxData(String(validatedBankData.accountNumber))
      const accountLast4 = extractLast4(String(validatedBankData.accountNumber))

      const routingValue = String(validatedBankData.bsb || '')
      const encryptedRouting = encryptTaxData(routingValue || 'N/A')
      const routingLast4 = routingValue ? extractLast4(routingValue) : '0000'
      
      // Extract last 3 digits of BSB for masked display
      const bsbLast3 = routingValue.replace(/\D/g, '').slice(-3)

      const tenantId = (employee as any).tenantId
      if (!tenantId) {
        return { status: 500, data: { error: "Employee tenant is missing" } }
      }

      const taxInfoDoc = await EmployeeTaxInfo.findOneAndUpdate(
        { employeeId: (employee as any)._id, tenantId },
        {
          $set: {
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
                type: 'bsb',
                valueEncrypted: encryptedRouting,
                last4: routingLast4,
              },
              bankName: validatedBankData.bankName,
              accountType: validatedBankData.accountType,
            },
          },
          $setOnInsert: {
            employeeId: (employee as any)._id,
            tenantId,
          },
        },
        { new: true, upsert: true }
      )

      // --- Upsert compliance (work rights + optional certifications) ---
      const isAustralian = String(body.nationality).toLowerCase().includes('austral')
      const complianceUpdates: Record<string, unknown> = {
        tenantId,
        employeeId: (employee as any)._id,
        workRightsType: isAustralian ? 'au_citizen' : 'visa_holder',
        australianIdType: isAustralian ? (body.australianIdType ?? null) : null,
        australianIdNumber: isAustralian ? (body.australianIdNumber || null) : null,
        visaType: !isAustralian ? (body.visaType || null) : null,
        visaNumber: !isAustralian ? (body.visaNumber || null) : null,
        maxHoursPerFortnight: !isAustralian && body.maxHoursPerFortnight ? body.maxHoursPerFortnight : null,
        workRightsStatus: 'unverified',
        workRightsLastCheckedAt: null,
      }

      // Check if employee has required certifications
      const hasCertifications = Array.isArray((employee as any).certifications) && (employee as any).certifications.length > 0

      if (hasCertifications) {
        complianceUpdates.wwcStatus = body.wwcStatus || 'pending'
        complianceUpdates.wwcExpiryDate = body.wwcExpiryDate ? new Date(body.wwcExpiryDate) : null
        complianceUpdates.policeClearanceStatus = body.policeClearanceStatus || 'pending'
        complianceUpdates.policeClearanceExpiryDate = body.policeClearanceExpiryDate ? new Date(body.policeClearanceExpiryDate) : null
        complianceUpdates.foodHandlingStatus = body.foodHandlingStatus || 'current'
        complianceUpdates.foodHandlingExpiryDate = body.foodHandlingExpiryDate ? new Date(body.foodHandlingExpiryDate) : null
      }

      await EmployeeCompliance.findOneAndUpdate(
        { tenantId, employeeId: (employee as any)._id },
        { $set: complianceUpdates, $setOnInsert: { tenantId, employeeId: (employee as any)._id } },
        { new: true, upsert: true }
      )

      // Update employee with onboarding data (single source of truth)
      const updateData: Record<string, unknown> = {
        // Personal information
        name: `${body.firstName} ${body.lastName}`.trim(),
        email: body.email,
        phone: body.phone,
        homeAddress: formatHomeAddress(),
        address: {
          line1: body.addressLine1,
          line2: body.addressLine2,
          city: body.city,
          state: body.state,
          postcode: body.postcode,
          country: body.country,
        },
        emergencyContact: {
          name: body.emergencyContactName,
          phone: body.emergencyContactPhone,
        },

        // Legal details
        legalFirstName: body.legalFirstName,
        legalMiddleNames: body.legalMiddleNames,
        legalLastName: body.legalLastName,
        preferredName: body.preferredName,
        nationality: body.nationality,
        timeZone: body.timeZone,

        // Link tax info
        taxInfoId: (taxInfoDoc as any)._id,

        // Mark onboarding as completed
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        
        // Set granular onboarding status
        onboardingStatus: {
          personal: true,
          identity: true,
          tax: true,
          bank: true,
        },
        
        updatedAt: new Date(),
      }

      const updatedEmployee = await Employee.findByIdAndUpdate(
        employeeAuth.sub,
        { $set: updateData },
        { new: true, runValidators: true }
      )

      if (!updatedEmployee) {
        return {
          status: 500,
          data: { error: "Failed to update employee" }
        }
      }

      try {
        await EmployeeSelfAuditLog.create({
          tenantId,
          employeeId: (employee as any)._id,
          action: 'COMPLETE_ONBOARDING',
          changedFields: Object.keys(updateData),
          ipAddress: req.headers.get('x-forwarded-for') || '',
          userAgent: req.headers.get('user-agent') || '',
        })
      } catch {
        // ignore audit failures
      }

      return {
        status: 200,
        data: {
          message: "Onboarding completed successfully",
          employee: {
            id: String((updatedEmployee as any)._id),
            name: (updatedEmployee as any).name,
            onboardingCompleted: (updatedEmployee as any).onboardingCompleted,
          }
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[employee/complete-onboarding POST]", err)
      }
      return {
        status: 500,
        data: { error: "Failed to complete onboarding" }
      }
    }
  }
})
