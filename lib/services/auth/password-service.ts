import { connectDB, User, Employee } from "@/lib/db";
import { hashToken, isTokenValid } from "@/lib/utils/auth/auth-tokens";
import { getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { getEmployeeFromWebCookie, createEmployeeWebToken, setEmployeeWebCookie } from "@/lib/auth/employee-auth";
import { sendEmail } from "@/lib/mail/sendEmail";
import { generatePasswordChangedEmail } from "@/lib/mail/templates/password-changed-confirmation";

export class PasswordService {
  async changePassword(body: any) {
    const { currentPassword, newPassword } = body;

    const adminAuth = await getAuthFromCookie();
    const employeeAuth = await getEmployeeFromWebCookie();
    if (!adminAuth && !employeeAuth) return { status: 401, data: { error: "Not authenticated" } };

    await connectDB();
    const bcrypt = await import("bcrypt");

    if (adminAuth) {
      const user = await User.findById(adminAuth.sub).select("+password");
      if (!user) return { status: 404, data: { error: "User not found" } };

      const isValid = await bcrypt.compare(currentPassword, (user as any).password);
      if (!isValid) return { status: 400, data: { error: "Current password is incorrect" } };

      (user as any).password = newPassword;
      await (user as any).save();

      if ((user as any).email) {
        try {
          const emailContent = generatePasswordChangedEmail({
            name: (user as any).name || "Admin",
            email: (user as any).email,
            changedAt: new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }),
          });
          await sendEmail({ to: (user as any).email, subject: emailContent.subject, html: emailContent.html, plain: emailContent.plain });
        } catch {}
      }

      return { status: 200, data: { message: "Password changed successfully" } };
    }

    const employee = await Employee.findById(employeeAuth!.sub).select("+password");
    if (!employee) return { status: 404, data: { error: "Employee not found" } };

    const isValid = (employee as any).password ? await bcrypt.compare(currentPassword, (employee as any).password) : false;
    if (!isValid) return { status: 400, data: { error: "Current password is incorrect" } };

    (employee as any).password = newPassword;
    (employee as any).passwordChangedAt = new Date();
    (employee as any).requirePasswordChange = false;
    await (employee as any).save();

    if ((employee as any).email) {
      try {
        const emailContent = generatePasswordChangedEmail({
          name: (employee as any).name,
          email: (employee as any).email,
          changedAt: new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }),
        });
        await sendEmail({ to: (employee as any).email, subject: emailContent.subject, html: emailContent.html, plain: emailContent.plain });
      } catch {}
    }

    return { status: 200, data: { message: "Password changed successfully" } };
  }

  async setupPasswordVerify(token: string) {
    await connectDB();
    const hashedToken = hashToken(token);
    const employee = await Employee.findOne({ passwordSetupToken: hashedToken }).select("+passwordSetupToken +passwordSetupExpiry").lean();
    if (!employee) return { status: 400, data: { error: "Invalid token" } };
    if (!isTokenValid((employee as any).passwordSetupExpiry)) return { status: 400, data: { error: "Token has expired" } };
    return { status: 200, data: { valid: true, email: (employee as any).email, name: (employee as any).name, pin: (employee as any).pin } };
  }

  async setupPassword(token: string, newPassword: string) {
    await connectDB();
    const hashedToken = hashToken(token);
    const employee = await Employee.findOne({ passwordSetupToken: hashedToken }).select("+passwordSetupToken +passwordSetupExpiry");
    if (!employee) return { status: 400, data: { error: "Invalid token" } };
    if (!isTokenValid((employee as any).passwordSetupExpiry)) return { status: 400, data: { error: "Token has expired" } };

    (employee as any).password = newPassword;
    (employee as any).passwordSetupToken = null;
    (employee as any).passwordSetupExpiry = null;
    (employee as any).passwordChangedAt = new Date();
    (employee as any).requirePasswordChange = false;
    await (employee as any).save();

    const authToken = await createEmployeeWebToken({ sub: String((employee as any)._id), pin: (employee as any).pin });
    await setEmployeeWebCookie(authToken);
    return { status: 200, data: { message: "Password set successfully", redirect: "/staff/dashboard" } };
  }

  async resetPasswordVerify(token: string) {
    await connectDB();
    const hashedToken = hashToken(token);

    const user = await User.findOne({ passwordResetToken: hashedToken }).select("+passwordResetToken +passwordResetExpiry").lean();
    if (user && isTokenValid((user as any).passwordResetExpiry)) {
      return { status: 200, data: { valid: true, email: (user as any).email, name: (user as any).name, type: "admin" as const } };
    }

    const employee = await Employee.findOne({ passwordResetToken: hashedToken }).select("+passwordResetToken +passwordResetExpiry").lean();
    if (employee && isTokenValid((employee as any).passwordResetExpiry)) {
      return { status: 200, data: { valid: true, email: (employee as any).email, name: (employee as any).name, type: "employee" as const } };
    }

    return { status: 400, data: { error: "Invalid or expired token" } };
  }

  async resetPassword(token: string, newPassword: string) {
    await connectDB();
    const hashedToken = hashToken(token);

    const user = await User.findOne({ passwordResetToken: hashedToken }).select("+passwordResetToken +passwordResetExpiry");
    if (user && isTokenValid((user as any).passwordResetExpiry)) {
      (user as any).password = newPassword;
      (user as any).passwordResetToken = null;
      (user as any).passwordResetExpiry = null;
      await (user as any).save();
      return { status: 200, data: { message: "Password reset successfully", userType: "admin" as const } };
    }

    const employee = await Employee.findOne({ passwordResetToken: hashedToken }).select("+passwordResetToken +passwordResetExpiry");
    if (employee && isTokenValid((employee as any).passwordResetExpiry)) {
      (employee as any).password = newPassword;
      (employee as any).passwordResetToken = null;
      (employee as any).passwordResetExpiry = null;
      (employee as any).passwordChangedAt = new Date();
      (employee as any).requirePasswordChange = false;
      await (employee as any).save();
      return { status: 200, data: { message: "Password reset successfully", userType: "employee" as const } };
    }

    return { status: 400, data: { error: "Invalid or expired token" } };
  }
}

export const passwordService = new PasswordService();

