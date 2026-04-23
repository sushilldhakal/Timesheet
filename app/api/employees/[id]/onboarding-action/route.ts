/**
 * HR Onboarding Action API
 * 
 * Handles HR approval workflow actions:
 * - mark_verified: Sets onboardingWorkflowStatus to 'manually_verified'
 * - approve: Sets onboardingWorkflowStatus to 'approved', activates employee
 * - flag_action_required: Sets onboardingWorkflowStatus to 'action_required', notifies staff
 * - resend_invite: Generates new token and resends setup email
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthWithUserLocations } from '@/lib/auth/auth-api'
import { connectDB, Employee } from '@/lib/db'
import { generateTokenWithExpiry } from '@/lib/utils/auth/auth-tokens'
import { sendEmail } from '@/lib/mail/sendEmail'
import { generateOnboardingSetupLinkEmail } from '@/lib/mail/templates/employee-onboarding-setup-link'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ctx = await getAuthWithUserLocations()
    if (!ctx || !['admin', 'manager', 'super_admin'].includes(ctx.auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, note } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    await connectDB()

    const employee = await Employee.findById(params.id)
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Verify tenant access (super_admin can access all)
    if (ctx.tenantId !== 'SUPER_ADMIN' && String((employee as any).tenantId) !== String(ctx.tenantId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    switch (action) {
      case 'mark_verified': {
        await Employee.findByIdAndUpdate(params.id, {
          $set: { onboardingWorkflowStatus: 'manually_verified' }
        })
        return NextResponse.json({ success: true, status: 'manually_verified' })
      }

      case 'approve': {
        await Employee.findByIdAndUpdate(params.id, {
          $set: {
            onboardingWorkflowStatus: 'approved',
            isActive: true,
          }
        })

        // Notify employee of approval
        if ((employee as any).email) {
          try {
            await sendEmail({
              to: (employee as any).email,
              subject: 'Your account has been approved',
              html: `
                <h2>Account Approved</h2>
                <p>Hi ${(employee as any).name},</p>
                <p>Your account has been reviewed and approved. You can now access all features of the system.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/staff/dashboard">Go to Dashboard</a></p>
              `,
              plain: `Hi ${(employee as any).name},\n\nYour account has been reviewed and approved. You can now access all features of the system.`,
              orgId: String((employee as any).tenantId),
            })
          } catch { /* ignore email failures */ }
        }

        return NextResponse.json({ success: true, status: 'approved' })
      }

      case 'flag_action_required': {
        await Employee.findByIdAndUpdate(params.id, {
          $set: { onboardingWorkflowStatus: 'action_required' }
        })

        // Notify employee of required action
        if ((employee as any).email && note) {
          try {
            await sendEmail({
              to: (employee as any).email,
              subject: 'Action required on your onboarding',
              html: `
                <h2>Action Required</h2>
                <p>Hi ${(employee as any).name},</p>
                <p>HR has reviewed your onboarding and requires some additional information or corrections:</p>
                <blockquote style="border-left: 3px solid #e5e7eb; padding-left: 1rem; color: #6b7280;">${note}</blockquote>
                <p>Please log in and update your information.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/staff/onboarding">Update Onboarding</a></p>
              `,
              plain: `Hi ${(employee as any).name},\n\nHR has reviewed your onboarding and requires some additional information:\n\n${note}\n\nPlease log in and update your information.`,
              orgId: String((employee as any).tenantId),
            })
          } catch { /* ignore email failures */ }
        }

        return NextResponse.json({ success: true, status: 'action_required' })
      }

      case 'resend_invite': {
        if (!(employee as any).email) {
          return NextResponse.json({ error: 'Employee has no email address' }, { status: 400 })
        }

        const tokenData = generateTokenWithExpiry(24)
        await Employee.findByIdAndUpdate(params.id, {
          $set: {
            passwordSetupToken: tokenData.hashedToken,
            passwordSetupExpiry: tokenData.expiry,
          }
        })

        const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/setup-password?token=${tokenData.token}`
        const emailContent = generateOnboardingSetupLinkEmail({
          name: (employee as any).name,
          pin: (employee as any).pin,
          email: (employee as any).email,
          phone: (employee as any).phone || '',
          setupUrl,
        })

        await sendEmail({
          to: (employee as any).email,
          subject: emailContent.subject,
          html: emailContent.html,
          plain: emailContent.plain,
          orgId: String((employee as any).tenantId),
        })

        return NextResponse.json({ success: true, message: 'Invite resent' })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[onboarding-action]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
