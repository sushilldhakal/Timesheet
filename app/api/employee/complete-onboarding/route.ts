/**
 * Complete Employee Onboarding API
 * 
 * Handles completion of employee self-onboarding process
 */

import { getEmployeeFromWebCookie } from "@/lib/auth/employee-auth"
import { connectDB, Employee } from "@/lib/db"
import { onboardingFormSchema } from "@/lib/validations/onboarding"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

const completeOnboardingResponseSchema = z.object({
  message: z.string(),
  employee: z.object({
    id: z.string(),
    name: z.string(),
    onboardingCompleted: z.boolean(),
  })
})

const errorResponseSchema = z.object({
  error: z.string()
})

// POST - Complete employee onboarding
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employee/complete-onboarding',
  summary: 'Complete employee onboarding',
  description: 'Complete the employee self-onboarding process with all required information',
  tags: ['Employee'],
  security: 'employeeAuth',
  request: {
    body: onboardingFormSchema
  },
  responses: {
    200: completeOnboardingResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      const employeeAuth = await getEmployeeFromWebCookie()
      if (!employeeAuth) {
        return {
          status: 401,
          data: { error: "Not authenticated" }
        }
      }

      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        }
      }

      await connectDB()

      // Find the employee
      const employee = await Employee.findById(employeeAuth.sub)
      if (!employee) {
        return {
          status: 404,
          data: { error: "Employee not found" }
        }
      }

      // Check if onboarding is already completed
      if ((employee as any).onboardingCompleted) {
        return {
          status: 400,
          data: { error: "Onboarding already completed" }
        }
      }

      // Update employee with onboarding data
      const updateData = {
        // Personal information
        name: `${body.firstName} ${body.lastName}`.trim(),
        email: body.email,
        phone: body.phone,
        
        // Legal details
        legalFirstName: body.legalFirstName,
        legalMiddleNames: body.legalMiddleNames,
        legalLastName: body.legalLastName,
        preferredName: body.preferredName,
        nationality: body.nationality,
        timeZone: body.timeZone,
        locale: body.locale,
        
        // Employment details
        employmentType: body.contractType,
        standardHoursPerWeek: body.wageType === 'salary' ? 38 : undefined, // Default for salary
        
        // Mark onboarding as completed
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedEmployee = await Employee.findByIdAndUpdate(
        employeeAuth.sub,
        { $set: updateData },
        { new: true, runValidators: true }
      )

      if (!updatedEmployee) {
        return {
          status: 500,
          data: { error: "Failed to update employee" }
        }
      }

      // TODO: Store additional onboarding data in separate collections
      // - Tax information (EmployeeTaxInfo)
      // - Bank details (EmployeeBankDetails) 
      // - Contract details (EmployeeContract)
      // - Compliance records (EmployeeCompliance)

      return {
        status: 200,
        data: {
          message: "Onboarding completed successfully",
          employee: {
            id: String((updatedEmployee as any)._id),
            name: (updatedEmployee as any).name,
            onboardingCompleted: (updatedEmployee as any).onboardingCompleted,
          }
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[employee/complete-onboarding POST]", err)
      }
      return {
        status: 500,
        data: { error: "Failed to complete onboarding" }
      }
    }
  }
})