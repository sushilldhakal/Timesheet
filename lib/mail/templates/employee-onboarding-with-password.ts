type OnboardingWithPasswordEmailData = {
  name: string
  pin: string
  email: string
  phone: string
  roles?: string[]
  locations?: string[]
}

export function generateOnboardingWithPasswordEmail(data: OnboardingWithPasswordEmailData) {
  const { name, pin, email, phone, roles, locations } = data

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Timesheet</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Welcome to Timesheet!</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 16px;">Your account has been created</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${name}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Your employee account has been created with a temporary password. You'll need to change it on your first login.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 500; width: 140px;">Name:</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 600;">${name}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 500;">Email:</td>
                        <td style="color: #111827; font-size: 14px;">${email}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 500;">PIN (for kiosk):</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 600; font-family: 'Courier New', monospace; background-color: #fef3c7; padding: 4px 8px; border-radius: 4px; display: inline-block;">${pin}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 500;">Phone:</td>
                        <td style="color: #111827; font-size: 14px;">${phone}</td>
                      </tr>
                      ${roles && roles.length > 0 ? `
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 500; vertical-align: top; padding-top: 12px;">Role(s):</td>
                        <td style="color: #111827; font-size: 14px; padding-top: 12px;">
                          ${roles.map(role => `<span style="display: inline-block; background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; margin: 2px 4px 2px 0; font-size: 13px;">${role}</span>`).join('')}
                        </td>
                      </tr>
                      ` : ''}
                      ${locations && locations.length > 0 ? `
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; font-weight: 500; vertical-align: top; padding-top: 12px;">Location(s):</td>
                        <td style="color: #111827; font-size: 14px; padding-top: 12px;">
                          ${locations.map(loc => `<span style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 12px; margin: 2px 4px 2px 0; font-size: 13px;">${loc}</span>`).join('')}
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                      <strong>⚠️ Important:</strong>
                    </p>
                    <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                      Your administrator has set a temporary password for you. You will be required to change it when you first log in to the web portal.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                <strong>Two ways to access the system:</strong>
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px; background-color: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0;">
                    <p style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 600;">
                      🖥️ Web Portal (Full Access)
                    </p>
                    <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                      Login with your email and password to access timesheets, rosters, and profile settings.
                    </p>
                  </td>
                </tr>
                <tr><td style="height: 12px;"></td></tr>
                <tr>
                  <td style="padding: 16px; background-color: #eff6ff; border-radius: 6px; border: 1px solid #bfdbfe;">
                    <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                      📱 Kiosk (Quick Clock In/Out)
                    </p>
                    <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                      Use your PIN <strong>${pin}</strong> at the kiosk to quickly clock in and out.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                If you have any questions, please contact your supervisor or HR department.
              </p>
              
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Best regards,<br>
                <strong>Timesheet Team</strong>
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const plain = `
Welcome to Timesheet!

Hi ${name},

Your employee account has been created with a temporary password. You will be required to change it when you first log in to the web portal.

Account Details:
Name: ${name}
Email: ${email}
PIN (for kiosk): ${pin}
Phone: ${phone}
${roles && roles.length > 0 ? `Role(s): ${roles.join(', ')}` : ''}
${locations && locations.length > 0 ? `Location(s): ${locations.join(', ')}` : ''}

Two ways to access the system:

🖥️ Web Portal (Full Access)
Login with your email and password to access timesheets, rosters, and profile settings.

📱 Kiosk (Quick Clock In/Out)
Use your PIN ${pin} at the kiosk to quickly clock in and out.

⚠️ Important: You will be required to change your password on first login to the web portal.

If you have any questions, please contact your supervisor or HR department.

Best regards,
Timesheet Team

---
This is an automated message. Please do not reply to this email.
  `.trim()

  return { 
    subject: "Welcome to Timesheet - Your Account Details",
    html, 
    plain 
  }
}
