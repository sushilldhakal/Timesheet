

import { NextResponse } from "next/server"
import { createApiRoute } from "@/lib/api/create-api-route"
import { setupStatusResponseSchema } from "@/lib/validations/setup"
import { setupStatusService } from "@/lib/services/setup/setup-status-service"

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
      return {
        status: 200,
        data: await setupStatusService.getStatus(),
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
