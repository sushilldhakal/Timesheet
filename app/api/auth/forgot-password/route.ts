/**
 * Forgot Password API
 * 
 * Handles password reset requests for both admins and employees
 * Sends email with reset link
 */

import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import { findUserByEmail } from "@/lib/utils/email-validator"
import { generateTokenWithExpiry } from "@/lib/utils/auth-tokens"
import { sendEmail } from "@/lib/mail/sendEmail"
import { generatePasswordResetEmail } from "@/lib/mail/templates/password-reset"
import { z } from "zod"

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = forgotPasswordSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    const { email } = parsed.data
    await connectDB()

    // Find user in either collection
    const result = await findUserByEmail(email)

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (result && result.user) {
      const { token, hashedToken, expiry } = generateTokenWithExpiry(24) // 24 hours

      // Update user with reset token
      if (result.type === "admin") {
        const { User } = await import("@/lib/db/schemas/user")
        await User.findByIdAndUpdate(result.user._id, {
          passwordResetToken: hashedToken,
          passwordResetExpiry: expiry,
        })
      } else if (result.type === "employee") {
        const { Employee } = await import("@/lib/db/schemas/employee")
        await Employee.findByIdAndUpdate(result.user._id, {
          passwordResetToken: hashedToken,
          passwordResetExpiry: expiry,
        })
      }

      // Send reset email
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`
      
      const emailContent = generatePasswordResetEmail({
        name: result.user.name || "there",
        email,
        resetUrl,
      })

      await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        plain: emailContent.plain,
      })

      if (process.env.NODE_ENV === "development") {
        console.log(`[Forgot Password] Reset link sent to ${email}`)
        console.log(`[Forgot Password] Reset URL: ${resetUrl}`)
      }
    }

    // Always return success (security best practice)
    return NextResponse.json({
      success: true,
      message: "If that email exists in our system, we've sent a password reset link.",
    })
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/forgot-password]", err)
    }
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    )
  }
}
