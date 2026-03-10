

import { NextResponse } from "next/server"
import { needsAdminSetup } from "@/lib/db/setup"
import { createApiRoute } from "@/lib/api/create-api-route"
import { setupStatusResponseSchema } from "@/lib/validations/setup"
import { mongoose } from "@/lib/db"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/setup/status',
  summary: 'Get setup status',
  description: 'Check if the application setup is complete',
  tags: ['Setup'],
  security: 'none',
  responses: {
    200: setupStatusResponseSchema,
    500: setupStatusResponseSchema,
  },
  handler: async () => {
    try {
      const setupRequired = await needsAdminSetup()
      return {
        status: 200,
        data: { 
          success: true,
          data: {
            isSetupComplete: !setupRequired,
            hasAdmin: !setupRequired,
            databaseConnected: true,
            requiredSteps: setupRequired ? ['Create admin user'] : [],
            completedSteps: setupRequired ? [] : ['Create admin user'],
            needsSetup: setupRequired
          }
        }
      };
    } catch (err) {
      console.error("[setup/status]", err)
      return {
        status: 500,
        data: { success: false, error: "Failed to check setup status" }
      };
    }
  }
});
