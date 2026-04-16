import { createApiRoute } from "@/lib/api/create-api-route";
import {
  awardUpdateSchema,
  awardIdParamSchema,
  singleAwardResponseSchema,
  awardResponseSchema,
} from "@/lib/validations/award";
import { errorResponseSchema, successResponseSchema } from "@/lib/validations/auth";
import { awardService } from "@/lib/services/award/award-service";

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/awards/{id}',
  summary: 'Get single award',
  description: 'Get an award by ID',
  tags: ['Awards'],
  security: 'adminAuth',
  request: {
    params: awardIdParamSchema,
  },
  responses: {
    200: singleAwardResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const { id } = params!;
    return await awardService.get(id);
  }
});

export const PUT = createApiRoute({
  method: 'PUT',
  path: '/api/awards/{id}',
  summary: 'Update award',
  description: 'Update an award by ID',
  tags: ['Awards'],
  security: 'adminAuth',
  request: {
    params: awardIdParamSchema,
    body: awardUpdateSchema,
  },
  responses: {
    200: awardResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const { id } = params!;
    return await awardService.update(id, body);
  }
});

export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/awards/{id}',
  summary: 'Delete award',
  description: 'Delete an award by ID (only if not assigned to employees)',
  tags: ['Awards'],
  security: 'adminAuth',
  request: {
    params: awardIdParamSchema,
  },
  responses: {
    200: successResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const { id } = params!;
    return await awardService.remove(id);
  }
});
