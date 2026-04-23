/**
 * Employee Onboarding Progress API
 * GET  /api/employee/onboarding-progress  — load saved progress
 * PATCH /api/employee/onboarding-progress — save step data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEmployeeFromWebCookie } from '@/lib/auth/employee-auth'
import { connectDB, Employee } from '@/lib/db'
import { EmployeeTaxInfo } from '@/lib/db/schemas/employee-tax-info'
import { EmployeeCompliance } from '@/lib/db/schemas/employee-compliance'
import { EmployeeBankDetails } from '@/lib/db/schemas/employee-bank-details'
import {
  staffOnboardingStep1Schema,
  staffOnboardingStep2Schema,
  staffOnboardingStep3Schema,
  staffOnboardingStep4Schema,
} from '@/lib/validations/staff-onboarding'
import { z } from 'zod'

const patchBodySchema = z.object({
  step: z.number().int().min(1).max(5),
  data: z.record(z.string(), z.unknown()),
})

export async function GET() {
  try {
    const employeeAuth = await getEmployeeFromWebCookie()
    if (!employeeAuth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    await connectDB()

    const employee = await Employee.findById(employeeAuth.sub).lean()
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const completedSteps: number[] = []
    const onboardingStatus = (employee as any).onboardingStatus || {}
    // 5-step flow: 1=personal, 2=eligibility+tax, 3=banking, 4=docs, 5=review
    if (onboardingStatus.personal) completedSteps.push(1)
    if (onboardingStatus.identity || onboardingStatus.tax) completedSteps.push(2)
    if (onboardingStatus.bank) completedSteps.push(3)

    const savedData: Record<string, any> = {
      employee: {
        legalFirstName: (employee as any).legalFirstName,
        legalLastName: (employee as any).legalLastName,
        legalMiddleNames: (employee as any).legalMiddleNames,
        preferredName: (employee as any).preferredName,
        dob: (employee as any).dob,
        gender: (employee as any).gender,
        address: (employee as any).address,
        emergencyContact: (employee as any).emergencyContact,
      },
    }

    const compliance = await EmployeeCompliance.findOne({ employeeId: employeeAuth.sub }).lean()
    if (compliance) savedData.compliance = compliance

    const taxInfo = await EmployeeTaxInfo.findOne({ employeeId: employeeAuth.sub }).lean()
    if (taxInfo) savedData.taxInfo = taxInfo

    const bankDetails = await EmployeeBankDetails.findOne({ employeeId: employeeAuth.sub }).lean()
    if (bankDetails) savedData.bankDetails = bankDetails

    return NextResponse.json({
      completedSteps,
      savedData,
      onboardingCountry: (employee as any).onboardingCountry || 'AU',
      certifications: (employee as any).certifications || [],
    })
  } catch (err) {
    console.error('[onboarding-progress GET]', err)
    return NextResponse.json({ error: 'Failed to load onboarding progress' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const employeeAuth = await getEmployeeFromWebCookie()
    if (!employeeAuth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const rawBody = await req.json()

    // Validate envelope
    const envelopeResult = patchBodySchema.safeParse(rawBody)
    if (!envelopeResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: envelopeResult.error.flatten() },
        { status: 400 }
      )
    }

    const { step, data: rawData } = envelopeResult.data

    // Validate step data against the appropriate Zod schema
    const onboardingCountry = (rawData as any).country || 'AU'
    let stepValidation: { success: boolean; data?: any; error?: z.ZodError } | null = null

    if (step === 1) {
      stepValidation = staffOnboardingStep1Schema.safeParse(rawData)
    } else if (step === 2) {
      stepValidation = staffOnboardingStep2Schema.safeParse({ ...rawData, country: onboardingCountry })
    } else if (step === 3) {
      stepValidation = staffOnboardingStep3Schema.safeParse({ ...rawData, country: onboardingCountry })
    } else if (step === 4) {
      // Documents step — certifications array may be empty, that's fine
      stepValidation = staffOnboardingStep4Schema.safeParse({
        country: onboardingCountry,
        certifications: (rawData as any).certifications ?? [],
        citizenshipDocFrontUrl: (rawData as any).citizenshipDocFrontUrl,
        citizenshipDocBackUrl: (rawData as any).citizenshipDocBackUrl,
        passportDocUrl: (rawData as any).passportDocUrl,
        visaDocUrl: (rawData as any).visaDocUrl,
      })
    }

    if (stepValidation && !stepValidation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: stepValidation.error?.flatten() },
        { status: 400 }
      )
    }

    // Use validated data where available, raw data for step 4/5 which have looser rules
    const d = stepValidation?.success ? stepValidation.data : rawData as any

    await connectDB()

    const employee = await Employee.findById(employeeAuth.sub)
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const tenantId = (employee as any).tenantId

    switch (step) {
      case 1:
        await Employee.findByIdAndUpdate(employeeAuth.sub, {
          $set: {
            legalFirstName: d.legalFirstName,
            legalLastName: d.legalLastName,
            legalMiddleNames: d.legalMiddleNames,
            preferredName: d.preferredName,
            dob: d.dob,
            gender: d.gender,
            address: {
              line1: d.addressLine1,
              line2: d.addressLine2,
              city: d.city,
              state: d.state,
              postcode: d.postcode,
              country: d.country,
            },
            emergencyContact: {
              name: d.emergencyContactName,
              relationship: d.emergencyContactRelationship,
              phone: d.emergencyContactPhone,
            },
            'onboardingStatus.personal': true,
          },
        })
        // Transition not_started → in_progress on first step save
        await Employee.findOneAndUpdate(
          { _id: employeeAuth.sub, onboardingWorkflowStatus: { $in: ['not_started', null] } },
          { $set: { onboardingWorkflowStatus: 'in_progress' } }
        )
        break

      case 2:
        // Step 2: Work Eligibility + Tax (merged)
        await EmployeeCompliance.findOneAndUpdate(
          { employeeId: employeeAuth.sub, tenantId },
          {
            $set: {
              country: d.country,
              workRightsType: d.workRightsType,
              australianIdType: d.australianIdType ?? null,
              australianIdNumber: d.australianIdNumber ?? null,
              passportNumber: d.passportNumber,
              passportExpiry: d.passportExpiry ? new Date(d.passportExpiry) : undefined,
              visaSubclass: d.visaSubclass,
              visaGrantNumber: d.visaGrantNumber,
              visaWorkConditions: d.visaWorkConditions,
              maxHoursPerFortnight: d.maxHoursPerFortnight,
              citizenshipCertNumber: d.citizenshipCertNumber,
              citizenshipIssuedDistrict: d.citizenshipIssuedDistrict,
              citizenshipIssuedDate: d.citizenshipIssuedDate ? new Date(d.citizenshipIssuedDate) : undefined,
              nationalIdNumber: d.nationalIdNumber,
              panNepal: d.panNepal ?? null,
              irdNumber: d.irdNumber ?? null,
              taxCodeNZ: d.taxCodeNZ ?? null,
              // Tax fields co-located with work rights
              tfn: d.tfn ?? null,
              taxFreeThreshold: d.taxFreeThreshold ?? null,
              hasHelpDebt: d.hasHelpDebt ?? null,
            },
            $setOnInsert: { employeeId: employeeAuth.sub, tenantId },
          },
          { new: true, upsert: true }
        )
        await Employee.findByIdAndUpdate(employeeAuth.sub, {
          $set: {
            'onboardingStatus.identity': true,
            'onboardingStatus.tax': true,
          },
        })
        break

      case 3: {
        // Step 3: Banking & Super
        const accountNumber = String(d.accountNumber || '').replace(/\D/g, '')
        const bsbCode = String(d.bsbCode || '').replace(/\D/g, '')
        await EmployeeBankDetails.findOneAndUpdate(
          { employeeId: employeeAuth.sub, tenantId },
          {
            $set: {
              accountNumber: d.accountNumber,
              accountNumberLast4: accountNumber.slice(-4),
              bsbCode: d.bsbCode,
              bsbLast3: bsbCode.slice(-3),
              accountHolderName: d.accountHolderName,
              bankName: d.bankName,
              accountType: d.accountType,
              superFundName: d.superFundName,
              superUSI: d.superUSI,
              superMemberNumber: d.superMemberNumber,
              nepalBankName: d.nepalBankName,
              nepalBranch: d.nepalBranch,
              nepalAccountNumber: d.nepalAccountNumber,
              ssfNumber: d.ssfNumber,
            },
            $setOnInsert: { employeeId: employeeAuth.sub, tenantId },
          },
          { new: true, upsert: true }
        )
        await Employee.findByIdAndUpdate(employeeAuth.sub, {
          $set: { 'onboardingStatus.bank': true },
        })
        break
      }

      case 4:
        // Step 4: Documents — persist certifications and country-specific doc URLs
        if (Array.isArray(d.certifications)) {
          await Employee.findByIdAndUpdate(employeeAuth.sub, {
            $set: { certifications: d.certifications },
          })
        }
        // Persist country-specific document URLs to compliance record
        if (d.citizenshipDocFrontUrl || d.citizenshipDocBackUrl || d.passportDocUrl || d.visaDocUrl) {
          await EmployeeCompliance.findOneAndUpdate(
            { employeeId: employeeAuth.sub, tenantId },
            {
              $set: {
                ...(d.citizenshipDocFrontUrl && { citizenshipDocFrontUrl: d.citizenshipDocFrontUrl }),
                ...(d.citizenshipDocBackUrl && { citizenshipDocBackUrl: d.citizenshipDocBackUrl }),
                ...(d.passportDocUrl && { passportDocUrl: d.passportDocUrl }),
                ...(d.visaDocUrl && { visaDocUrl: d.visaDocUrl }),
              },
              $setOnInsert: { employeeId: employeeAuth.sub, tenantId },
            },
            { new: true, upsert: true }
          )
        }
        break

      case 5:
        // Step 5: Review & Submit — handled by /api/employee/complete-onboarding
        break
    }

    const updated = await Employee.findById(employeeAuth.sub).lean()
    const status = (updated as any)?.onboardingStatus || {}
    const completedSteps: number[] = []
    if (status.personal) completedSteps.push(1)
    if (status.identity || status.tax) completedSteps.push(2)
    if (status.bank) completedSteps.push(3)

    return NextResponse.json({ success: true, completedSteps })
  } catch (err) {
    console.error('[onboarding-progress PATCH]', err)
    return NextResponse.json({ error: 'Failed to save onboarding progress' }, { status: 500 })
  }
}
