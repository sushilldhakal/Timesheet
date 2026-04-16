import { createApiRoute } from '@/lib/api/create-api-route'
import { errorResponseSchema } from '@/lib/validations/auth'
import { z } from 'zod'
import { awardVersionsService } from '@/lib/services/award/award-versions-service'

const versionParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
  versionId: z.string(),
})

const versionDetailResponseSchema = z.object({
  _id: z.string(),
  name: z.string(),
  version: z.string(),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable(),
  changelog: z.string().nullable().optional(),
  isCurrent: z.boolean(),
  rules: z.array(z.any()),
  levelRates: z.array(z.any()),
  availableTags: z.array(z.any()),
})

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/awards/{id}/versions/{versionId}',
  summary: 'Get specific award version',
  description: 'Get a specific version of an award by version history ID or version string',
  tags: ['Awards', 'Versioning'],
  security: 'adminAuth',
  request: {
    params: versionParamsSchema,
  },
  responses: {
    200: versionDetailResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const { id, versionId } = params!
    return await awardVersionsService.getVersion({ id, versionId })
  },
})
