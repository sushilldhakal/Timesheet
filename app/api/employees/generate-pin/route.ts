import { getAuthWithUserLocations } from "@/lib/auth/auth-api"
import { connectDB, Employee } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { pinGenerationResponseSchema } from "@/lib/validations/employee-pin"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/generate-pin',
  summary: 'Generate unique PIN',
  description: 'Returns a unique random 4-digit PIN for clock-in',
  tags: ['Employees'],
  security: 'adminAuth',
  responses: {
    200: pinGenerationResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async () => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    try {
      await connectDB()
      const existing = await Employee.find({}, { pin: 1 }).lean()
      const usedPins = new Set((existing || []).map((e) => String(e.pin ?? "")))

      let pin: string
      let attempts = 0
      const maxAttempts = 100
      do {
        pin = String(Math.floor(1000 + Math.random() * 9000))
        attempts++
        if (attempts >= maxAttempts) {
          return { status: 500, data: { error: "Could not generate unique PIN. Try again." } };
        }
      } while (usedPins.has(pin))

      return { status: 200, data: { pin } };
    } catch (err) {
      console.error("[api/employees/generate-pin]", err)
      return { status: 500, data: { error: "Failed to generate PIN" } };
    }
  }
});
