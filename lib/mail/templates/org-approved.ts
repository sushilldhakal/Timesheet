type OrgApprovedData = {
  contactName: string;
  orgName: string;
  setupUrl: string;
  expiryHours: number;
};

export function generateOrgApprovedEmail(data: OrgApprovedData) {
  const { contactName, orgName, setupUrl, expiryHours } = data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Timesheet!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600;">🎉 Welcome to Timesheet!</h1>
              <p style="margin: 10px 0 0 0; color: #ede9fe; font-size: 16px;">Your organization is ready to go</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${contactName}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Great news! Your signup request for <strong>${orgName}</strong> has been approved. Your Timesheet account is now ready.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf5ff; border-left: 4px solid #8b5cf6; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; color: #6b21a8; font-size: 14px; font-weight: 600;">
                      🔐 Set up your password
                    </p>
                    <p style="margin: 0; color: #6b21a8; font-size: 14px; line-height: 1.6;">
                      Click the button below to create your password and access your account. This link will expire in <strong>${expiryHours} hours</strong>.
                    </p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${setupUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                      Set Up Password →
                    </a>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                      🚀 Getting Started
                    </p>
                    <p style="margin: 0 0 12px 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
                      Once you've set your password, you can:
                    </p>
                    <ul style="margin: 0; padding-left: 20px; color: #1e3a8a; font-size: 14px; line-height: 1.8;">
                      <li>Add your team members</li>
                      <li>Set up locations and roles</li>
                      <li>Configure your organization settings</li>
                      <li>Start tracking time</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px 0; color: #3b82f6; font-size: 14px; word-break: break-all;">
                ${setupUrl}
              </p>
              
              <p style="margin: 0 0 10px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Need help? Check out our <a href="https://docs.timesheet.com" style="color: #8b5cf6; text-decoration: none; font-weight: 600;">documentation</a> or reply to this email.
              </p>
              
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Welcome aboard!<br>
                <strong>Timesheet Team</strong>
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                This link will expire in ${expiryHours} hours for security reasons.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const plain = `
Welcome to Timesheet!

Hi ${contactName},

Great news! Your signup request for ${orgName} has been approved. Your Timesheet account is now ready.

🔐 Set up your password
Click the link below to create your password and access your account. This link will expire in ${expiryHours} hours.

${setupUrl}

🚀 Getting Started
Once you've set your password, you can:
- Add your team members
- Set up locations and roles
- Configure your organization settings
- Start tracking time

Need help? Check out our documentation at https://docs.timesheet.com or reply to this email.

Welcome aboard!
Timesheet Team

---
This link will expire in ${expiryHours} hours for security reasons.
  `.trim();

  return {
    subject: `Welcome to Timesheet - ${orgName}`,
    html,
    plain,
  };
}
