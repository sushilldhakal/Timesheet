import type { CompanySize } from "@/lib/db/schemas/org-signup-request";
import type { EmployerPlan } from "@/lib/db/schemas/employer";

type OrgSignupSuperadminNotifyData = {
  orgName: string;
  contactName: string;
  email: string;
  phone?: string;
  companySize?: CompanySize;
  planInterest?: EmployerPlan;
  message?: string;
  reviewUrl: string;
};

export function generateOrgSignupSuperadminNotifyEmail(data: OrgSignupSuperadminNotifyData) {
  const { orgName, contactName, email, phone, companySize, planInterest, message, reviewUrl } = data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Organization Signup Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">🎉 New Signup Request</h1>
              <p style="margin: 10px 0 0 0; color: #dbeafe; font-size: 16px;">A new organization wants to join Timesheet</p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Hi Admin,
              </p>
              
              <p style="margin: 0 0 30px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                A new organization has submitted a signup request. Please review the details below:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; font-weight: 600; width: 140px;">Organization:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${orgName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Contact Name:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${contactName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${email}</td>
                      </tr>
                      ${phone ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Phone:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${phone}</td>
                      </tr>
                      ` : ''}
                      ${companySize ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Company Size:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px;">${companySize} employees</td>
                      </tr>
                      ` : ''}
                      ${planInterest ? `
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Plan Interest:</td>
                        <td style="padding: 8px 0; color: #111827; font-size: 14px; text-transform: capitalize;">${planInterest}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
              
              ${message ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px; font-weight: 600;">
                      💬 Message from requester:
                    </p>
                    <p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
                      ${message}
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="${reviewUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);">
                      Review Request →
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Best regards,<br>
                <strong>Timesheet System</strong>
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.5;">
                This is an automated notification from Timesheet.
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
New Organization Signup Request

Hi Admin,

A new organization has submitted a signup request. Please review the details below:

Organization: ${orgName}
Contact Name: ${contactName}
Email: ${email}
${phone ? `Phone: ${phone}` : ''}
${companySize ? `Company Size: ${companySize} employees` : ''}
${planInterest ? `Plan Interest: ${planInterest}` : ''}

${message ? `💬 Message from requester:\n${message}\n` : ''}

Review Request: ${reviewUrl}

Best regards,
Timesheet System

---
This is an automated notification from Timesheet.
  `.trim();

  return {
    subject: `New Org Signup Request: ${orgName}`,
    html,
    plain,
  };
}
