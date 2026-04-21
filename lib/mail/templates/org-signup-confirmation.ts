type OrgSignupConfirmationData = {
  contactName: string;
  orgName: string;
};

export function generateOrgSignupConfirmationEmail(data: OrgSignupConfirmationData) {
  const { contactName, orgName } = data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Received - Timesheet</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">✓ Request Received</h1>
              <p style="margin: 10px 0 0 0; color: #d1fae5; font-size: 16px;">We've received your signup request</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi <strong>${contactName}</strong>,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in Timesheet! We've received your signup request for <strong>${orgName}</strong>.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; color: #065f46; font-size: 14px; font-weight: 600;">
                      ⏱️ What happens next?
                    </p>
                    <p style="margin: 0; color: #065f46; font-size: 14px; line-height: 1.6;">
                      Our team will review your request and get back to you within <strong>1 business day</strong>. You'll receive an email once your account is ready.
                    </p>
                  </td>
                </tr>
              </table>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                      💡 In the meantime
                    </p>
                    <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6;">
                      Check out our <a href="https://docs.timesheet.com" style="color: #2563eb; text-decoration: none; font-weight: 600;">documentation</a> to learn more about Timesheet's features and how to get the most out of your account.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 10px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                If you have any questions, feel free to reply to this email.
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
                This is an automated confirmation from Timesheet.
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
Request Received - Timesheet

Hi ${contactName},

Thank you for your interest in Timesheet! We've received your signup request for ${orgName}.

⏱️ What happens next?
Our team will review your request and get back to you within 1 business day. You'll receive an email once your account is ready.

💡 In the meantime
Check out our documentation at https://docs.timesheet.com to learn more about Timesheet's features and how to get the most out of your account.

If you have any questions, feel free to reply to this email.

Best regards,
Timesheet Team

---
This is an automated confirmation from Timesheet.
  `.trim();

  return {
    subject: "We've Received Your Request - Timesheet",
    html,
    plain,
  };
}
