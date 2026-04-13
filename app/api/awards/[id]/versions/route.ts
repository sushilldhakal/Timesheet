import { connectDB } from '@/lib/db'
import Award from '@/lib/db/schemas/award'
import { getAwardHistory } from '@/lib/awards/get-award-for-date'
import { createNewAwardVersion } from '@/lib/awards/create-award-version'
import { createApiRoute } from '@/lib/api/create-api-route'
import { awardIdParamSchema } from '@/lib/validations/award'
import { errorResponseSchema } from '@/lib/validations/auth'
import { z } from 'zod'

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
    try {
      await connectDB()
      const { id } = params!

      const award = await Award.findById(id)
      if (!award) {
        return { status: 404, data: { error: 'Award not found' } }
      }

      const versions = await getAwardHistory(id)

      const serialized = versions.map((v: any) => ({
        _id: v._id?.toString(),
        baseAwardId: v.baseAwardId?.toString(),
        name: v.name,
        description: v.description,
        version: v.version,
        effectiveFrom: v.effectiveFrom instanceof Date ? v.effectiveFrom.toISOString() : v.effectiveFrom,
        effectiveTo: v.effectiveTo instanceof Date ? v.effectiveTo.toISOString() : v.effectiveTo ?? null,
        changelog: v.changelog ?? null,
        isCurrent: v.isCurrent,
        rules: v.rules ?? [],
        levelRates: v.levelRates ?? [],
        availableTags: v.availableTags ?? [],
        createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
        createdBy: v.createdBy?.toString(),
      }))

      return { status: 200, data: { versions: serialized } }
    } catch (error: any) {
      console.error('Error fetching award versions:', error)
      return { status: 500, data: { error: 'Failed to fetch versions', details: error.message } }
    }
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
    try {
      await connectDB()
      const { id } = params!
      const {
        rules,
        levelRates,
        availableTags,
        name,
        description,
        changelog,
        effectiveFrom: effectiveFromStr,
        versionBump,
      } = body!

      const award = await Award.findById(id)
      if (!award) {
        return { status: 404, data: { error: 'Award not found' } }
      }

      const effectiveFrom = new Date(effectiveFromStr)
      const now = new Date()
      if (effectiveFrom <= now) {
        return {
          status: 400,
          data: { error: 'effectiveFrom must be a future date' },
        }
      }

      const updatedAward = await createNewAwardVersion(
        award,
        { rules, levelRates, availableTags, name, description },
        { changelog, effectiveFrom, versionBump }
      )

      return {
        status: 201,
        data: {
          award: {
            ...updatedAward.toObject(),
            _id: updatedAward._id.toString(),
            effectiveFrom: updatedAward.effectiveFrom.toISOString(),
            effectiveTo: updatedAward.effectiveTo?.toISOString() ?? null,
            createdAt: updatedAward.createdAt.toISOString(),
            updatedAt: updatedAward.updatedAt.toISOString(),
          },
          message: `Version ${updatedAward.version} created successfully`,
        },
      }
    } catch (error: any) {
      console.error('Error creating award version:', error)
      return { status: 500, data: { error: 'Failed to create version', details: error.message } }
    }
  },
})
