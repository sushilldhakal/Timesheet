/**
 * Aadhaar OTP Verification API (STUB)
 * 
 * TODO: Replace with real UIDAI eKYC API integration - requires government credentials
 * 
 * Real implementation would:
 * 1. Verify OTP against transaction ID
 * 2. Retrieve and return demographic data
 * 3. Update EmployeeCompliance with verified status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getEmployeeFromWebCookie } from '@/lib/auth/employee-auth'
import { z } from 'zod'

const verifyOtpRequestSchema = z.object({
  transactionId: z.string(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
})

export async function POST(req: NextRequest) {
  try {
    const employeeAuth = await getEmployeeFromWebCookie()
    if (!employeeAuth) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const validated = verifyOtpRequestSchema.parse(body)

    // TODO: Replace with real UIDAI eKYC API integration
    // This is a STUB implementation that simulates a 2-second API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Simulated success response
    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Aadhaar verified successfully',
      // In real implementation, would return demographic data
      data: {
        name: 'Verified Name',
        dob: '1990-01-01',
        gender: 'M',
        address: 'Verified Address',
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }
    console.error('[verify-aadhaar-otp] Error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
