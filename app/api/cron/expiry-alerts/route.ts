/**
 * Expiry Alerts Cron Job
 * 
 * Runs daily at 9 AM to check for:
 * - Visa/passport expiry within 60 days
 * - Certification expiry within 30 days
 * - Stale password setup invites (expired and onboarding not complete)
 * 
 * Sends email alerts to HR/Manager
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Employee } from '@/lib/db/schemas/employee'
import { EmployeeCompliance } from '@/lib/db/schemas/employee-compliance'
import { User } from '@/lib/db/schemas/user'
import { sendEmail } from '@/lib/mail/sendEmail'
import { ExpiryAlertLog } from '@/lib/db/schemas/expiry-alert-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const now = new Date()
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Find employees with onboarding completed
    const employees = await Employee.find({ 
      onboardingCompleted: true 
    }).lean()

    const alerts: Array<{
      tenantId: string
      employeeId: string
      employeeName: string
      employeeEmail: string
      alertType: string
      message: string
      expiryDate?: Date
    }> = []

    // Track seen alert keys to suppress duplicates within the same run
    const seenAlertKeys = new Set<string>()

    // Helper: returns true if this alert key was already sent today (persisted in DB)
    const isAlreadySent = async (key: string): Promise<boolean> => {
      if (seenAlertKeys.has(key)) return true
      const existing = await ExpiryAlertLog.findOne({ alertKey: key }).lean()
      if (existing) {
        seenAlertKeys.add(key)
        return true
      }
      return false
    }

    const markSent = async (key: string) => {
      seenAlertKeys.add(key)
      try {
        await ExpiryAlertLog.updateOne(
          { alertKey: key },
          { $setOnInsert: { alertKey: key, sentAt: new Date() } },
          { upsert: true }
        )
      } catch { /* ignore duplicate key race */ }
    }

    // Check visa/passport expiry
    for (const employee of employees) {
      const compliance = await EmployeeCompliance.findOne({ 
        employeeId: (employee as any)._id 
      }).lean()

      if (compliance) {
        // Check visa expiry via passportExpiry (visa holders)
        if ((compliance as any).passportExpiry && new Date((compliance as any).passportExpiry) <= sixtyDaysFromNow) {
          const key = `passport_${String((employee as any)._id)}`
          if (!(await isAlreadySent(key))) {
            await markSent(key)
            alerts.push({
              tenantId: String((employee as any).tenantId),
              employeeId: String((employee as any)._id),
              employeeName: (employee as any).name,
              employeeEmail: (employee as any).email || '',
              alertType: 'passport_expiry',
              message: `Passport expiring on ${new Date((compliance as any).passportExpiry).toLocaleDateString()}`,
              expiryDate: (compliance as any).passportExpiry,
            })
          }
        }
      }

      // Check certification expiry
      const certifications = (employee as any).certifications || []
      for (const cert of certifications) {
        if (cert.expiryDate && new Date(cert.expiryDate) <= thirtyDaysFromNow) {
          const key = `cert_${String((employee as any)._id)}_${cert.type}`
          if (!(await isAlreadySent(key))) {
            await markSent(key)
            alerts.push({
              tenantId: String((employee as any).tenantId),
              employeeId: String((employee as any)._id),
              employeeName: (employee as any).name,
              employeeEmail: (employee as any).email || '',
              alertType: 'certification_expiry',
              message: `${cert.label || cert.type} expiring on ${new Date(cert.expiryDate).toLocaleDateString()}`,
              expiryDate: cert.expiryDate,
            })
          }
        }
      }
    }

    // Check stale password setup invites
    const staleInvites = await Employee.find({
      onboardingCompleted: false,
      passwordSetupExpiry: { $lt: now },
    }).lean()

    for (const employee of staleInvites) {
      const key = `stale_invite_${String((employee as any)._id)}`
      if (await isAlreadySent(key)) continue
      await markSent(key)
      alerts.push({
        tenantId: String((employee as any).tenantId),
        employeeId: String((employee as any)._id),
        employeeName: (employee as any).name,
        employeeEmail: (employee as any).email || '',
        alertType: 'stale_invite',
        message: `Password setup invite expired on ${new Date((employee as any).passwordSetupExpiry).toLocaleDateString()}`,
        expiryDate: (employee as any).passwordSetupExpiry,
      })
    }

    // Group alerts by tenant and send emails
    const alertsByTenant = new Map<string, typeof alerts>()
    for (const alert of alerts) {
      if (!alertsByTenant.has(alert.tenantId)) {
        alertsByTenant.set(alert.tenantId, [])
      }
      alertsByTenant.get(alert.tenantId)!.push(alert)
    }

    let emailsSent = 0
    for (const [tenantId, tenantAlerts] of alertsByTenant) {
      // Find HR/Manager users for this tenant
      const hrUsers = await User.find({
        tenantId,
        role: { $in: ['admin', 'manager'] },
      }).select('email name').lean()

      if (hrUsers.length === 0) continue

      // Build email content
      const alertsByType = {
        visa_expiry: tenantAlerts.filter(a => a.alertType === 'visa_expiry'),
        passport_expiry: tenantAlerts.filter(a => a.alertType === 'passport_expiry'),
        certification_expiry: tenantAlerts.filter(a => a.alertType === 'certification_expiry'),
        stale_invite: tenantAlerts.filter(a => a.alertType === 'stale_invite'),
      }

      let htmlContent = '<h2>Employee Expiry Alerts</h2>'
      let plainContent = 'Employee Expiry Alerts\n\n'

      if (alertsByType.visa_expiry.length > 0) {
        htmlContent += '<h3>Visa Expiry (within 60 days)</h3><ul>'
        plainContent += 'Visa Expiry (within 60 days):\n'
        for (const alert of alertsByType.visa_expiry) {
          htmlContent += `<li><strong>${alert.employeeName}</strong>: ${alert.message}</li>`
          plainContent += `- ${alert.employeeName}: ${alert.message}\n`
        }
        htmlContent += '</ul>'
        plainContent += '\n'
      }

      if (alertsByType.passport_expiry.length > 0) {
        htmlContent += '<h3>Passport Expiry (within 60 days)</h3><ul>'
        plainContent += 'Passport Expiry (within 60 days):\n'
        for (const alert of alertsByType.passport_expiry) {
          htmlContent += `<li><strong>${alert.employeeName}</strong>: ${alert.message}</li>`
          plainContent += `- ${alert.employeeName}: ${alert.message}\n`
        }
        htmlContent += '</ul>'
        plainContent += '\n'
      }

      if (alertsByType.certification_expiry.length > 0) {
        htmlContent += '<h3>Certification Expiry (within 30 days)</h3><ul>'
        plainContent += 'Certification Expiry (within 30 days):\n'
        for (const alert of alertsByType.certification_expiry) {
          htmlContent += `<li><strong>${alert.employeeName}</strong>: ${alert.message}</li>`
          plainContent += `- ${alert.employeeName}: ${alert.message}\n`
        }
        htmlContent += '</ul>'
        plainContent += '\n'
      }

      if (alertsByType.stale_invite.length > 0) {
        htmlContent += '<h3>Stale Onboarding Invites</h3><ul>'
        plainContent += 'Stale Onboarding Invites:\n'
        for (const alert of alertsByType.stale_invite) {
          htmlContent += `<li><strong>${alert.employeeName}</strong>: ${alert.message} - <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/employees/${alert.employeeId}">Resend Invite</a></li>`
          plainContent += `- ${alert.employeeName}: ${alert.message}\n`
        }
        htmlContent += '</ul>'
        plainContent += '\n'
      }

      // Send email to each HR user
      for (const hrUser of hrUsers) {
        if ((hrUser as any).email) {
          try {
            await sendEmail({
              to: (hrUser as any).email,
              subject: `Employee Expiry Alerts (${tenantAlerts.length} items)`,
              html: htmlContent,
              plain: plainContent,
              orgId: tenantId,
            })
            emailsSent++
          } catch (err) {
            console.error(`[expiry-alerts] Failed to send email to ${(hrUser as any).email}:`, err)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      alertsFound: alerts.length,
      emailsSent,
    })
  } catch (error) {
    console.error('[expiry-alerts] Cron job failed:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
