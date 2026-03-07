/**
 * Unified Login API
 * 
 * Handles login for both admins (users collection) and employees (employees collection)
 * Routes to appropriate dashboard based on user type
 * Supports explicit loginAs parameter to handle users who exist in both collections
 */

import { NextRequest, NextResponse } from "next/server"
import { connectDB, User, Employee } from "@/lib/db"
import { createAuthToken, setAuthCookie } from "@/lib/auth/auth-helpers"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  loginAs: z.enum(["admin", "staff"]).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = loginSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      )
    }

    const { email, password, loginAs } = parsed.data
    const normalizedEmail = email.trim().toLowerCase()

    await connectDB()

    // If user explicitly chose "staff", check employees only
    if (loginAs === "staff") {
      const employee = await Employee.findOne({ email: normalizedEmail })
        .select("+password")
        .lean()

      if (employee && employee.password) {
        const bcrypt = await import("bcrypt")
        const passwordMatch = await bcrypt.compare(password, employee.password)
        
        if (passwordMatch) {
          // Check if password change is required
          if (employee.requirePasswordChange) {
            const { createEmployeeWebToken, setEmployeeWebCookie } = await import("@/lib/auth/employee-auth")
            
            const token = await createEmployeeWebToken({
              sub: String(employee._id),
              pin: employee.pin,
            })

            await setEmployeeWebCookie(token)

            return NextResponse.json({
              success: true,
              requirePasswordChange: true,
              userType: "employee",
            })
          }

          // Employee found - create employee web session
          const { createEmployeeWebToken, setEmployeeWebCookie } = await import("@/lib/auth/employee-auth")
          
          const token = await createEmployeeWebToken({
            sub: String(employee._id),
            pin: employee.pin,
          })

          await setEmployeeWebCookie(token)

          const locations = Array.isArray(employee.location) ? employee.location : []
          const employers = Array.isArray(employee.employer) ? employee.employer : []

          return NextResponse.json({
            success: true,
            userType: "employee",
            redirect: "/staff/dashboard",
            user: {
              id: employee._id,
              name: employee.name,
              email: employee.email,
              pin: employee.pin,
              location: locations[0] || "",
              employer: employers[0] || "",
            },
          })
        }
      }
      
      // If not found as staff, return error
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // If user explicitly chose "admin", check users only
    if (loginAs === "admin") {
      const user = await User.findOne({ email: normalizedEmail })
        .select("+password")
        .lean()

      if (user && user.password) {
        const bcrypt = await import("bcrypt")
        const passwordMatch = await bcrypt.compare(password, user.password)
        
        if (passwordMatch) {
          // Admin/Manager found - create admin session
          const token = await createAuthToken({
            sub: String(user._id),
            username: user.username,
            role: user.role,
            location: Array.isArray(user.location) ? user.location[0] : user.location,
          })

          await setAuthCookie(token)

          return NextResponse.json({
            success: true,
            userType: "admin",
            redirect: "/dashboard",
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              username: user.username,
              role: user.role,
              location: user.location,
              rights: user.rights ?? [],
            },
          })
        }
      }

      // If not found as admin, return error
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // No loginAs specified - check both (admin first, then staff)
    // This is for backward compatibility
    const user = await User.findOne({ email: normalizedEmail })
      .select("+password")
      .lean()

    if (user && user.password) {
      const bcrypt = await import("bcrypt")
      const passwordMatch = await bcrypt.compare(password, user.password)
      
      if (passwordMatch) {
        const token = await createAuthToken({
          sub: String(user._id),
          username: user.username,
          role: user.role,
          location: Array.isArray(user.location) ? user.location[0] : user.location,
        })

        await setAuthCookie(token)

        return NextResponse.json({
          success: true,
          userType: "admin",
          redirect: "/dashboard",
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            location: user.location,
            rights: user.rights ?? [],
          },
        })
      }
    }

    // Check employees collection
    const employee = await Employee.findOne({ email: normalizedEmail })
      .select("+password")
      .lean()

    if (employee && employee.password) {
      const bcrypt = await import("bcrypt")
      const passwordMatch = await bcrypt.compare(password, employee.password)
      
      if (passwordMatch) {
        if (employee.requirePasswordChange) {
          const { createEmployeeWebToken, setEmployeeWebCookie } = await import("@/lib/auth/employee-auth")
          
          const token = await createEmployeeWebToken({
            sub: String(employee._id),
            pin: employee.pin,
          })

          await setEmployeeWebCookie(token)

          return NextResponse.json({
            success: true,
            requirePasswordChange: true,
            userType: "employee",
          })
        }

        const { createEmployeeWebToken, setEmployeeWebCookie } = await import("@/lib/auth/employee-auth")
        
        const token = await createEmployeeWebToken({
          sub: String(employee._id),
          pin: employee.pin,
        })

        await setEmployeeWebCookie(token)

        const locations = Array.isArray(employee.location) ? employee.location : []
        const employers = Array.isArray(employee.employer) ? employee.employer : []

        return NextResponse.json({
          success: true,
          userType: "employee",
          redirect: "/staff/dashboard",
          user: {
            id: employee._id,
            name: employee.name,
            email: employee.email,
            pin: employee.pin,
            location: locations[0] || "",
            employer: employers[0] || "",
          },
        })
      }
    }

    // Not found in either collection or password mismatch
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    )
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/unified-login]", err)
    }
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    )
  }
}
