import { createApiRoute } from "@/lib/api/create-api-route";
import {
  awardQuerySchema,
  awardCreateSchema,
  awardsListResponseSchema,
  awardCreateResponseSchema,
} from "@/lib/validations/award";
import { errorResponseSchema } from "@/lib/validations/auth";
import { awardService } from "@/lib/services/award/award-service";
import { getAuthWithUserLocations } from "@/lib/auth/auth-api"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/awards',
  summary: 'List awards',
  description: 'Get a paginated list of awards with optional search',
  tags: ['Awards'],
  security: 'adminAuth',
  request: {
    query: awardQuerySchema,
  },
  responses: {
    200: awardsListResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx?.tenantId) return { status: 401, data: { error: "Unauthorized" } }
    return {
      status: 200,
      data: await awardService.list({ tenantId: ctx.tenantId, query }),
    };
  }
});

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/awards',
  summary: 'Create award',
  description: 'Create a new award',
  tags: ['Awards'],
  security: 'adminAuth',
  request: {
    body: awardCreateSchema,
  },
  responses: {
    201: awardCreateResponseSchema,
    400: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx?.tenantId) return { status: 401, data: { error: "Unauthorized" } }
    try {
      return {
        status: 201,
        data: await awardService.create({ tenantId: ctx.tenantId, body }),
      };
    } catch (error: any) {
      console.error("Error creating award:", error);
      return awardService.mapCreateUpdateError(error, "Failed to create award");
    }
  }
});
