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
          b.addressLine1,
          b.addressLine2,
          `${b.city} ${b.state} ${b.postcode}`.trim(),
          b.country,
        ].filter((p) => String(p || '').trim())
        return parts.join(', ')
      }

      // --- Create/Upsert encrypted tax + bank info ---
      // body is typed from the new staffOnboardingFormSchema — cast to any for flexible access
      const b = body as any
      // Use the country stored on the employee record — the form body carries the address
      // country (e.g. "Australia") not the onboarding country code (e.g. "AU").
      const countrySnapshot: CountryCode = ((employee as any).onboardingCountry || 'AU') as CountryCode
      const countryConfig = getCountryConfig(countrySnapshot)

      const taxSchema = getTaxSchema(countrySnapshot)
      const bankSchema = getBankSchema(countrySnapshot)

      // Build raw tax/bank objects per country — use safeParse so validation errors
      // don't throw and kill the whole request; fall back to the raw values.
      const rawTaxInput = countrySnapshot === 'AU'
        ? { taxId: b.tfn, taxFreeThreshold: b.taxFreeThreshold ?? false, studentLoan: b.hasHelpDebt ?? false, superannuationFund: b.superFundName, superannuationMemberNumber: b.superMemberNumber }
        : countrySnapshot === 'NP' || countrySnapshot === 'IN'
        ? { taxId: b.panNepal || b.panForTax, taxIdName: b.legalFirstName + ' ' + b.legalLastName }
        : countrySnapshot === 'NZ'
        ? { irdNumber: b.irdNumber, nzTaxCode: b.taxCodeNZ || 'ME' }
        : { taxId: b.tfn }

      const rawBankInput = countrySnapshot === 'AU'
        ? { accountName: b.accountHolderName, accountNumber: b.accountNumber, bsb: (b.bsbCode || '').replace(/\D/g, ''), bankName: b.bankName, accountType: b.accountType || 'savings' }
        : countrySnapshot === 'NP' || countrySnapshot === 'IN'
        ? { accountName: b.accountHolderName || b.legalFirstName, accountNumber: b.nepalAccountNumber, ifsc: b.nepalBranch || '0000000000', bankName: b.nepalBankName }
        : countrySnapshot === 'NZ'
        ? { accountName: b.accountHolderName || b.legalFirstName, iban: b.nzAccountNumber, bankName: b.bankName }
        : { accountName: b.accountHolderName, accountNumber: b.accountNumber }

      const taxParseResult = taxSchema.safeParse(rawTaxInput)
      const bankParseResult = bankSchema.safeParse(rawBankInput)

      if (!taxParseResult.success) {
        console.error('[complete-onboarding] Tax validation failed:', taxParseResult.error.flatten())
      }
      if (!bankParseResult.success) {
        console.error('[complete-onboarding] Bank validation failed:', bankParseResult.error.flatten())
      }

      const validatedTaxData = (taxParseResult.success ? taxParseResult.data : rawTaxInput) as any
      const validatedBankData = (bankParseResult.success ? bankParseResult.data : rawBankInput) as any

      const encryptedTaxId = validatedTaxData.taxId
        ? encryptTaxData(String(validatedTaxData.taxId))
        : encryptTaxData('N/A')
      const taxIdLast4 = validatedTaxData.taxId
        ? extractLast4(String(validatedTaxData.taxId))
        : '0000'

      const accountNum = String(validatedBankData.accountNumber || validatedBankData.iban || 'N/A')
      const encryptedAccount = encryptTaxData(accountNum)
      const accountLast4 = extractLast4(accountNum)

      const routingValue = String(validatedBankData.bsb || validatedBankData.ifsc || validatedBankData.routingNumber || '')
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
      const complianceUpdates: Record<string, unknown> = {
        country: countrySnapshot,
        workRightsType: b.workRightsType || 'unknown',
        australianIdType: b.australianIdType ?? null,
        australianIdNumber: b.australianIdNumber || null,
        visaType: b.visaSubclass || null,
        visaNumber: b.visaGrantNumber || null,
        passportNumber: b.passportNumber || null,
        passportExpiry: b.passportExpiry ? new Date(b.passportExpiry) : null,
        visaSubclass: b.visaSubclass || null,
        visaGrantNumber: b.visaGrantNumber || null,
        visaWorkConditions: b.visaWorkConditions || null,
        maxHoursPerFortnight: b.maxHoursPerFortnight || null,
        citizenshipCertNumber: b.citizenshipCertNumber || null,
        citizenshipIssuedDistrict: b.citizenshipIssuedDistrict || null,
        citizenshipIssuedDate: b.citizenshipIssuedDate ? new Date(b.citizenshipIssuedDate) : null,
        nationalIdNumber: b.nationalIdNumber || null,
        panNepal: b.panNepal || null,
        workRightsStatus: 'unverified',
        workRightsLastCheckedAt: null,
      }

      await EmployeeCompliance.findOneAndUpdate(
        { tenantId, employeeId: (employee as any)._id },
        { $set: complianceUpdates, $setOnInsert: { tenantId, employeeId: (employee as any)._id } },
        { new: true, upsert: true }
      )

      // Update employee with onboarding data (single source of truth)
      const updateData: Record<string, unknown> = {
        // Personal information
        name: `${b.legalFirstName} ${b.legalLastName}`.trim(),
        homeAddress: formatHomeAddress(),
        address: {
          line1: b.addressLine1,
          line2: b.addressLine2,
          city: b.city,
          state: b.state,
          postcode: b.postcode,
          country: b.country,
        },
        emergencyContact: {
          name: b.emergencyContactName,
          relationship: b.emergencyContactRelationship,
          phone: b.emergencyContactPhone,
        },
        dob: b.dob,
        gender: b.gender,

        // Legal details
        legalFirstName: b.legalFirstName,
        legalMiddleNames: b.legalMiddleNames,
        legalLastName: b.legalLastName,
        preferredName: b.preferredName,

        // Link tax info
        taxInfoId: (taxInfoDoc as any)._id,

        // Mark onboarding as completed
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        onboardingWorkflowStatus: 'completed',
        
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
        { new: true }
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

      // Notify HR/Manager that onboarding is complete and pending review
      try {
        const { User } = await import('@/lib/db/schemas/user')
        const { sendEmail } = await import('@/lib/mail/sendEmail')

        const employeeName = (updatedEmployee as any).name
        const employeeEmail = (updatedEmployee as any).email
        const profileUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/employees/${String((updatedEmployee as any)._id)}`
        const subject = `Onboarding Complete: ${employeeName}`
        const html = `
          <h2>Employee Onboarding Complete</h2>
          <p>Hi {{name}},</p>
          <p><strong>${employeeName}</strong> (${employeeEmail}) has completed their onboarding and is now pending review.</p>
          <p>Please review their information and approve their account to activate them in the system.</p>
          <p><a href="${profileUrl}">View Employee Profile</a></p>
        `
        const plain = `Hi {{name}},\n\n${employeeName} (${employeeEmail}) has completed their onboarding and is now pending review.\n\nPlease review: ${profileUrl}`

        // Prefer the HR user who originally invited this employee
        const invitedById = (employee as any).onboardingInvitedBy
        let recipients: Array<{ email: string; name: string }> = []

        if (invitedById) {
          const inviter = await User.findById(invitedById).select('email name').lean()
          if (inviter && (inviter as any).email) {
            recipients = [{ email: (inviter as any).email, name: (inviter as any).name || 'HR' }]
          }
        }

        // Fall back to all tenant admins/managers if no inviter found
        if (recipients.length === 0) {
          const hrUsers = await User.find({
            tenantId,
            role: { $in: ['admin', 'manager'] },
          }).select('email name').lean()
          recipients = hrUsers
            .filter((u: any) => u.email)
            .map((u: any) => ({ email: u.email, name: u.name || 'HR' }))
        }

        for (const recipient of recipients) {
          await sendEmail({
            to: recipient.email,
            subject,
            html: html.replace('{{name}}', recipient.name),
            plain: plain.replace('{{name}}', recipient.name),
            orgId: String(tenantId),
          })
        }
      } catch (emailErr) {
        console.error('[complete-onboarding] Failed to send HR notification:', emailErr)
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
      console.error("[employee/complete-onboarding POST]", err)
      return {
        status: 500,
        data: { error: "Failed to complete onboarding" }
      }
    }
  }
})
