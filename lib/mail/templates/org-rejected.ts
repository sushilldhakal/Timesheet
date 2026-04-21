type OrgRejectedData = {
  contactName: string;
  orgName: string;
  reviewNote: string;
};

export function generateOrgRejectedEmail(data: OrgRejectedData) {
  const { contactName, orgName, reviewNote } = data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signup Request Update - Timesheet</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Signup Request Update</h1>
              <p style="margin: 10px 0 0 0; color: #e2e8f0; font-size: 16px;">Regarding ${orgName}</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${contactName}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in Timesheet. After reviewing your signup request for <strong>${orgName}</strong>, we're unable to approve it at this time.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                      📋 Reason:
                    </p>
                    <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
                      ${reviewNote}
                    </p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                      💬 Want to discuss this?
                    </p>
                    <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
                      If you'd like to discuss this decision or reapply with additional information, please reply to this email. We're happy to help!
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
                This is an automated message from Timesheet.
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
Signup Request Update - Timesheet

Hi ${contactName},

Thank you for your interest in Timesheet. After reviewing your signup request for ${orgName}, we're unable to approve it at this time.

📋 Reason:
${reviewNote}

💬 Want to discuss this?
If you'd like to discuss this decision or reapply with additional information, please reply to this email. We're happy to help!

Best regards,
Timesheet Team

---
This is an automated message from Timesheet.
  `.trim();

  return {
    subject: `Signup Request Update - ${orgName}`,
    html,
    plain,
  };
}
