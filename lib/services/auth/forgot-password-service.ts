import { connectDB } from "@/lib/db";
import { findUserByEmail } from "@/lib/utils/validation/email-validator";
import { generateTokenWithExpiry } from "@/lib/utils/auth/auth-tokens";
import { sendEmail } from "@/lib/mail/sendEmail";
import { generatePasswordResetEmail } from "@/lib/mail/templates/password-reset";

export class ForgotPasswordService {
  async requestReset(email: string) {
    await connectDB();
    const result = await findUserByEmail(email);

    if (result && result.user) {
      const { token, hashedToken, expiry } = generateTokenWithExpiry(24);

      if (result.type === "admin") {
        const { User } = await import("@/lib/db/schemas/user");
        await User.findByIdAndUpdate(result.user._id, {
          passwordResetToken: hashedToken,
          passwordResetExpiry: expiry,
        });
      } else if (result.type === "employee") {
        const { Employee } = await import("@/lib/db/schemas/employee");
        await Employee.findByIdAndUpdate(result.user._id, {
          passwordResetToken: hashedToken,
          passwordResetExpiry: expiry,
        });
      }

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;
      const emailContent = generatePasswordResetEmail({
        name: result.user.name || "there",
        email,
        resetUrl,
      });

      await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        plain: emailContent.plain,
      });
    }

    return {
      status: 200,
      data: { message: "If that email exists in our system, we've sent a password reset link." },
    };
  }
}

export const forgotPasswordService = new ForgotPasswordService();

