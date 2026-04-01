import { getAuthWithUserLocations } from "@/lib/auth/auth-api";
import { connectDB } from "@/lib/db";
import { Roster } from "@/lib/db/schemas/roster";
import { createApiRoute } from "@/lib/api/create-api-route";
import { z } from "zod";
import mongoose from "mongoose";
import { errorResponseSchema } from "@/lib/validations/auth";

const bulkDeleteBodySchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid shift ID"))
    .min(1, "At least one ID required")
    .max(2000, "Maximum 2000 shifts per bulk delete"),
});

const bulkDeleteResponseSchema = z.object({
  deleted: z.number(),
  notFound: z.number(),
});

/**
 * DELETE /api/calendar/events/bulk
 * Removes up to 2 000 shifts in a single MongoDB updateMany $pull operation.
 * Far more efficient than N individual DELETE /api/calendar/events/:id calls —
 * used by conflict resolution to avoid N×GET amplification.
 */
export const DELETE = createApiRoute({
  method: "DELETE",
  path: "/api/calendar/events/bulk",
  summary: "Bulk delete calendar events",
  description:
    "Delete multiple shifts by ID in one DB round-trip. Avoids N×GET refetch amplification from conflict resolution.",
  tags: ["Calendar"],
  security: "adminAuth",
  request: { body: bulkDeleteBodySchema },
  responses: {
    200: bulkDeleteResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations();
    if (!ctx) return { status: 401, data: { error: "Unauthorized" } };

    const { ids } = body!;
    const oids = ids.map((id: string) => new mongoose.Types.ObjectId(id));

    try {
      await connectDB();

      // One updateMany removes matching shifts from all affected rosters in one round-trip
      const result = await Roster.updateMany(
        { "shifts._id": { $in: oids } },
        { $pull: { shifts: { _id: { $in: oids } } } } as Parameters<typeof Roster.updateMany>[1]
      );

      return {
        status: 200,
        data: {
          deleted: result.modifiedCount > 0 ? ids.length : 0,
          notFound: result.matchedCount === 0 ? ids.length : 0,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[DELETE /api/calendar/events/bulk]", err);
      return {
        status: 500,
        data: { error: "Bulk delete failed" } as z.infer<typeof errorResponseSchema>,
      };
    }
  },
});
