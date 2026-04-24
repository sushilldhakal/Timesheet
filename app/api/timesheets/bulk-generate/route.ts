import { getAuthWithUserLocations } from "@/lib/auth/auth-api";
import { createApiRoute } from "@/lib/api/create-api-route";
import { z } from "zod";
import { timesheetService } from "@/lib/services/timesheet/timesheet-service";

const bulkGenerateSchema = z.object({
  payPeriodStart: z.string(),
  payPeriodEnd: z.string(),
  employeeIds: z.array(z.string()).optional(),
});

export const POST = createApiRoute({
  method: "POST",
  path: "/api/timesheets/bulk-generate",
  summary: "Bulk generate timesheets for employees",
  description:
    "Generate timesheets for multiple employees for a given pay period. If employeeIds is omitted, generates for all active employees in the tenant. Requires admin role.",
  tags: ["Timesheets"],
  security: "adminAuth",
  request: { body: bulkGenerateSchema },
  responses: {
    200: z.object({
      created: z.number(),
      skipped: z.number(),
      failed: z.number(),
      results: z.array(
        z.object({
          employeeId: z.string(),
          status: z.enum(["created", "skipped", "failed"]),
          error: z.string().optional(),
        })
      ),
    }),
    400: z.object({ error: z.string() }),
    401: z.object({ error: z.string() }),
    403: z.object({ error: z.string() }),
    500: z.object({ error: z.string() }),
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations();
    if (!ctx) {
      return { status: 401, data: { error: "Unauthorized" } };
    }

    const allowedRoles = ["admin", "super_admin"];
    if (!allowedRoles.includes(ctx.auth.role)) {
      return { status: 403, data: { error: "Only admins can bulk generate timesheets" } };
    }

    const result = await timesheetService.bulkGenerate(ctx, body!);
    return { status: 200, data: result };
  },
});
