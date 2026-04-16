import { createApiRoute } from '@/lib/api/create-api-route'
import { awardIdParamSchema } from '@/lib/validations/award'
import { errorResponseSchema } from '@/lib/validations/auth'
import { z } from 'zod'
import { awardVersionsService } from '@/lib/services/award/award-versions-service'

const versionsListResponseSchema = z.object({
  versions: z.array(z.object({
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
    createdAt: z.string().optional(),
  })),
})

const createVersionBodySchema = z.object({
  rules: z.array(z.any()).optional(),
  levelRates: z.array(z.any()).optional(),
  availableTags: z.array(z.any()).optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  changelog: z.string().min(1, 'Changelog is required to explain changes'),
  effectiveFrom: z.string().datetime(),
  versionBump: z.enum(['major', 'minor', 'patch']).optional().default('minor'),
})

const createVersionResponseSchema = z.object({
  award: z.any(),
  versionHistory: z.any(),
})

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/awards/{id}/versions',
  summary: 'List award versions',
  description: 'Get all versions of an award (current + historical), ordered by effectiveFrom descending',
  tags: ['Awards', 'Versioning'],
  security: 'adminAuth',
  request: {
    params: awardIdParamSchema,
  },
  responses: {
    200: versionsListResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params }) => {
    const { id } = params!
    return await awardVersionsService.listVersions(id)
  },
})

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/awards/{id}/versions',
  summary: 'Create new award version',
  description: 'Create a new version of an award with rule/rate changes and an effective date',
  tags: ['Awards', 'Versioning'],
  security: 'adminAuth',
  request: {
    params: awardIdParamSchema,
    body: createVersionBodySchema,
  },
  responses: {
    201: createVersionResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, body }) => {
    const { id } = params!
    return await awardVersionsService.createVersion(id, body)
  },
})
