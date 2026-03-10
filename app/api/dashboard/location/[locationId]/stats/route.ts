import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  dashboardLocationIdParamSchema,
  dashboardDateQuerySchema, 
  locationStatsResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/location/{locationId}/stats',
  summary: 'Get location dashboard statistics',
  description: 'Get dashboard statistics for a specific location including role distribution and metrics',
  tags: ['Dashboard'],
  security: 'adminAuth',
  request: {
    params: dashboardLocationIdParamSchema,
    query: dashboardDateQuerySchema,
  },
  responses: {
    200: locationStatsResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ params, query }) => {
    const { getAuthWithUserLocations } = await import('@/lib/auth/auth-api')
    const { connectDB, Category } = await import('@/lib/db')
    const { dashboardCache } = await import('@/lib/utils/dashboard/dashboard-cache')
    const { 
      getUserPermissionContext, 
      canViewLocation 
    } = await import('@/lib/utils/dashboard/dashboard-permissions')
    const { getEnabledRolesForLocation } = await import('@/lib/utils/dashboard/dashboard-validation')
    const { 
      getActiveRoleAssignments,
      aggregateShiftData 
    } = await import('@/lib/utils/dashboard/dashboard-queries')
    const mongoose = await import('mongoose')

    const { ObjectId } = mongoose.Types

    try {
      // 1. Authentication
      const ctx = await getAuthWithUserLocations()
      if (!ctx) {
        return { status: 401, data: { error: 'Unauthorized' } }
      }

      // 2. Validate ObjectId format
      const { locationId } = params!
      if (!ObjectId.isValid(locationId)) {
        return {
          status: 400,
          data: { 
            error: 'Invalid location ID format',
            code: 'INVALID_OBJECT_ID'
          }
        }
      }

      // 3. Parse query parameters
      const { date: dateParam } = query || {}
      let effectiveDate = new Date()
      
      if (dateParam) {
        const parsed = new Date(dateParam)
        if (isNaN(parsed.getTime())) {
          return {
            status: 400,
            data: {
              error: 'Invalid date parameter',
              code: 'INVALID_DATE_FORMAT',
              details: {
                provided: dateParam,
                expected: 'ISO 8601 date string (e.g., 2024-01-15)'
              }
            }
          }
        }
        effectiveDate = parsed
      }

      // 4. Check cache
      const cacheKey = dashboardCache.generateKey(
        `/api/dashboard/location/${locationId}/stats`,
        { date: dateParam || undefined }
      )
      
      const cached = dashboardCache.get(cacheKey)
      if (cached) {
        return { status: 200, data: cached }
      }

      await connectDB()

      // 5. Authorization
      const permCtx = await getUserPermissionContext(ctx.auth.sub)
      if (!permCtx || !canViewLocation(permCtx, locationId)) {
        console.warn('[SECURITY] Unauthorized access attempt', {
          userId: ctx.auth.sub,
          resource: 'location',
          resourceId: locationId,
          timestamp: new Date().toISOString()
        })
        
        return {
          status: 403,
          data: { 
            error: 'Forbidden: You do not have permission to view this location',
            code: 'INSUFFICIENT_PERMISSIONS'
          }
        }
      }

      // 6. Verify location exists
      const location = await Category.findById(locationId)
        .select('name type')
        .lean()
      
      if (!location || location.type !== 'location') {
        return {
          status: 404,
          data: { 
            error: 'Location not found',
            code: 'RESOURCE_NOT_FOUND',
            details: { resourceType: 'location', resourceId: locationId }
          }
        }
      }

      // 7. Get enabled roles for this location
      const enabledRoleIds = await getEnabledRolesForLocation(
        locationId,
        effectiveDate
      )

      // 8. Get active role assignments
      const assignments = await getActiveRoleAssignments({
        locationId,
        effectiveDate
      })

      // Filter assignments to only enabled roles
      const filteredAssignments = assignments.filter(a =>
        enabledRoleIds.includes(String((a.roleId as any)._id))
      )

      // 9. Aggregate metrics
      const employeePins = filteredAssignments.map(a => (a.employeeId as any).pin)
      const uniquePins = [...new Set(employeePins)]
      
      const startDate = new Date(effectiveDate)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(effectiveDate)
      endDate.setHours(23, 59, 59, 999)
      
      const shiftData = await aggregateShiftData(
        uniquePins,
        startDate,
        endDate
      )

      // 10. Build role distribution
      const roleMap = new Map<string, {
        roleId: string
        roleName: string
        roleColor?: string
        employeeCount: number
        totalHours: number
      }>()

      for (const assignment of filteredAssignments) {
        const roleId = String((assignment.roleId as any)._id)
        const roleName = (assignment.roleId as any).name
        const roleColor = (assignment.roleId as any).color
        
        if (!roleMap.has(roleId)) {
          roleMap.set(roleId, {
            roleId,
            roleName,
            roleColor,
            employeeCount: 0,
            totalHours: 0
          })
        }
        
        roleMap.get(roleId)!.employeeCount += 1
      }

      const roleDistribution = Array.from(roleMap.values())
        .sort((a, b) => b.employeeCount - a.employeeCount)

      // 11. Build response
      const response = {
        metadata: {
          locationId,
          locationName: location.name,
          effectiveDate: effectiveDate.toISOString(),
          validationTimestamp: new Date().toISOString(),
          filters: {
            location: locationId,
            ...(dateParam && { date: dateParam })
          }
        },
        metrics: {
          employeeCount: uniquePins.length,
          totalHours: shiftData.totalHours,
          activeEmployees: shiftData.activeEmployees,
          roleDistribution
        },
        dailyTimeline: shiftData.dailyTimeline
      }

      // 12. Cache and return
      dashboardCache.set(cacheKey, response)

      return { status: 200, data: response }

    } catch (err) {
      console.error('[api/dashboard/location/stats GET]', err)
      return {
        status: 500,
        data: { 
          error: 'Failed to load dashboard statistics',
          code: 'DATABASE_ERROR'
        }
      }
    }
  }
})