/**
 * Email Validation and Uniqueness Checking
 * 
 * Ensures email uniqueness across both users and employees collections
 */

import { User } from "@/lib/db/schemas/user"
import { Employee } from "@/lib/db/schemas/employee"
import { connectDB } from "@/lib/db"

/**
 * Check if email exists in either users or employees collection
 * @param email - Email to check
 * @param excludeId - Optional ID to exclude from check (for updates)
 * @param collection - Optional: check only specific collection
 * @returns Object with exists flag and where it was found
 */
export async function checkEmailExists(
  email: string,
  excludeId?: string,
  collection?: "users" | "employees"
): Promise<{
  exists: boolean
  foundIn: "users" | "employees" | null
  userId?: string
}> {
  if (!email || !email.trim()) {
    return { exists: false, foundIn: null }
  }

  await connectDB()
  const normalizedEmail = email.trim().toLowerCase()

  // Check users collection
  if (!collection || collection === "users") {
    const query: any = { email: normalizedEmail }
    if (excludeId) {
      query._id = { $ne: excludeId }
    }
    
    const user = await User.findOne(query).lean()
    if (user) {
      return {
        exists: true,
        foundIn: "users",
        userId: String(user._id),
      }
    }
  }

  // Check employees collection
  if (!collection || collection === "employees") {
    const query: any = { email: normalizedEmail }
    if (excludeId) {
      query._id = { $ne: excludeId }
    }
    
    const employee = await Employee.findOne(query).lean()
    if (employee) {
      return {
        exists: true,
        foundIn: "employees",
        userId: String(employee._id),
      }
    }
  }

  return { exists: false, foundIn: null }
}

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return false
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Find user by email in either collection
 * @param email - Email to search for
 * @returns User/Employee object with type indicator
 */
export async function findUserByEmail(email: string): Promise<{
  user: any
  type: "admin" | "employee" | null
} | null> {
  if (!email || !email.trim()) return null

  await connectDB()
  const normalizedEmail = email.trim().toLowerCase()

  // Check users collection first (admins/managers)
  const user = await User.findOne({ email: normalizedEmail })
    .select("+password +passwordResetToken +passwordResetExpiry")
    .lean()
  
  if (user) {
    return {
      user,
      type: "admin",
    }
  }

  // Check employees collection
  const employee = await Employee.findOne({ email: normalizedEmail })
    .select("+password +passwordSetupToken +passwordSetupExpiry +passwordResetToken +passwordResetExpiry")
    .lean()
  
  if (employee) {
    return {
      user: employee,
      type: "employee",
    }
  }

  return null
}
