type PasswordChangedEmailData = {
  name: string
  email: string
  changedAt: string
}

export function generatePasswordChangedEmail(data: PasswordChangedEmailData) {
  const { name, email, changedAt } = data

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Changed Successfully</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Password Changed</h1>
              <p style="margin: 10px 0 0 0; color: #d1fae5; font-size: 16px;">Your password has been updated successfully</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${name}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                This is a confirmation that the password for your account (<strong>${email}</strong>) was successfully changed.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
                      <strong>✓ Changed on:</strong> ${changedAt}
                    </p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                      🔒 Didn't make this change?
                    </p>
                    <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6;">
                      If you didn't change your password, please contact your administrator immediately to secure your account.
                    </p>
                  </td>
                </tr>
              </table>
              
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
Password Changed Successfully

Hi ${name},

This is a confirmation that the password for your account (${email}) was successfully changed.

✓ Changed on: ${changedAt}

🔒 Didn't make this change?
If you didn't change your password, please contact your administrator immediately to secure your account.

Best regards,
Timesheet Team

---
This is an automated message. Please do not reply to this email.
  `.trim()

  return { 
    subject: "Password Changed Successfully - Timesheet",
    html, 
    plain 
  }
}
