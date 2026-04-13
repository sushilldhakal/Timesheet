import { connectDB } from '@/lib/db'
import Award from '@/lib/db/schemas/award'
import { AwardVersionHistory } from '@/lib/db/schemas/award-version-history'
import { createApiRoute } from '@/lib/api/create-api-route'
import { errorResponseSchema } from '@/lib/validations/auth'
import { z } from 'zod'

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
    try {
      await connectDB()
      const { id, versionId } = params!

      const award = await Award.findById(id).lean()
      if (!award) {
        return { status: 404, data: { error: 'Award not found' } }
      }

      // versionId could be a MongoDB ObjectId (history doc) or a version string like "1.2.0"
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(versionId)

      if (isObjectId) {
        // Check if versionId matches the current award
        if ((award as any)._id.toString() === versionId) {
          return {
            status: 200,
            data: {
              _id: (award as any)._id.toString(),
              name: award.name,
              description: award.description,
              version: award.version,
              effectiveFrom: (award as any).effectiveFrom instanceof Date
                ? (award as any).effectiveFrom.toISOString()
                : (award as any).effectiveFrom,
              effectiveTo: (award as any).effectiveTo
                ? ((award as any).effectiveTo instanceof Date
                    ? (award as any).effectiveTo.toISOString()
                    : (award as any).effectiveTo)
                : null,
              changelog: (award as any).changelog ?? null,
              isCurrent: true,
              rules: award.rules ?? [],
              levelRates: award.levelRates ?? [],
              availableTags: award.availableTags ?? [],
            },
          }
        }

        const historyDoc = await AwardVersionHistory.findOne({
          _id: versionId,
          baseAwardId: id,
        }).lean()

        if (!historyDoc) {
          return { status: 404, data: { error: 'Version not found' } }
        }

        return {
          status: 200,
          data: {
            _id: (historyDoc as any)._id.toString(),
            baseAwardId: (historyDoc as any).baseAwardId.toString(),
            name: historyDoc.name,
            description: historyDoc.description,
            version: historyDoc.version,
            effectiveFrom: historyDoc.effectiveFrom instanceof Date
              ? historyDoc.effectiveFrom.toISOString()
              : historyDoc.effectiveFrom,
            effectiveTo: historyDoc.effectiveTo
              ? (historyDoc.effectiveTo instanceof Date
                  ? historyDoc.effectiveTo.toISOString()
                  : historyDoc.effectiveTo)
              : null,
            changelog: historyDoc.changelog ?? null,
            isCurrent: false,
            rules: historyDoc.rules ?? [],
            levelRates: historyDoc.levelRates ?? [],
            availableTags: historyDoc.availableTags ?? [],
          },
        }
      }

      // Treat versionId as a version string like "1.2.0"
      if (award.version === versionId) {
        return {
          status: 200,
          data: {
            _id: (award as any)._id.toString(),
            name: award.name,
            description: award.description,
            version: award.version,
            effectiveFrom: (award as any).effectiveFrom instanceof Date
              ? (award as any).effectiveFrom.toISOString()
              : (award as any).effectiveFrom,
            effectiveTo: (award as any).effectiveTo
              ? ((award as any).effectiveTo instanceof Date
                  ? (award as any).effectiveTo.toISOString()
                  : (award as any).effectiveTo)
              : null,
            changelog: (award as any).changelog ?? null,
            isCurrent: true,
            rules: award.rules ?? [],
            levelRates: award.levelRates ?? [],
            availableTags: award.availableTags ?? [],
          },
        }
      }

      const historyByVersion = await AwardVersionHistory.findOne({
        baseAwardId: id,
        version: versionId,
      }).lean()

      if (!historyByVersion) {
        return { status: 404, data: { error: 'Version not found' } }
      }

      return {
        status: 200,
        data: {
          _id: (historyByVersion as any)._id.toString(),
          baseAwardId: (historyByVersion as any).baseAwardId.toString(),
          name: historyByVersion.name,
          description: historyByVersion.description,
          version: historyByVersion.version,
          effectiveFrom: historyByVersion.effectiveFrom instanceof Date
            ? historyByVersion.effectiveFrom.toISOString()
            : historyByVersion.effectiveFrom,
          effectiveTo: historyByVersion.effectiveTo
            ? (historyByVersion.effectiveTo instanceof Date
                ? historyByVersion.effectiveTo.toISOString()
                : historyByVersion.effectiveTo)
            : null,
          changelog: historyByVersion.changelog ?? null,
          isCurrent: false,
          rules: historyByVersion.rules ?? [],
          levelRates: historyByVersion.levelRates ?? [],
          availableTags: historyByVersion.availableTags ?? [],
        },
      }
    } catch (error: any) {
      console.error('Error fetching award version:', error)
      return { status: 500, data: { error: 'Failed to fetch version', details: error.message } }
    }
  },
})
