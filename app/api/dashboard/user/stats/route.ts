import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  dashboardDateQuerySchema, 
  userStatsResponseSchema, 
} from "@/lib/validations/dashboard"
import { errorResponseSchema } from "@/lib/validations/auth"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/dashboard/user/stats',
  summary: 'Get user dashboard statistics',
  description: 'Get dashboard statistics for the current user including managed locations and roles',
  tags: ['Dashboard'],
  security: 'adminAuth',
  request: {
    query: dashboardDateQuerySchema,
  },
  responses: {
    200: userStatsResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ query }) => {
    const { getAuthWithUserLocations } = await import('@/lib/auth/auth-api')
    const { connectDB, User } = await import('@/lib/db')
    const { dashboardCache } = await import('@/lib/utils/dashboard/dashboard-cache')
    const { getUserPermissionContext } = await import('@/lib/utils/dashboard/dashboard-permissions')
    const { validateLocationRolePairs } = await import('@/lib/utils/dashboard/dashboard-validation')
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

      // 2. Parse query parameters
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

      // 3. Check cache
      const cacheKey = dashboardCache.generateKey(
        `/api/dashboard/user/stats`,
        { userId: ctx.auth.sub, date: dateParam || undefined }
      )
      
      const cached = dashboardCache.get(cacheKey)
      if (cached) {
        return { status: 200, data: cached }
      }

      await connectDB()

      // 4. Load user permission context
      const permCtx = await getUserPermissionContext(ctx.auth.sub)
      if (!permCtx) {
        return { status: 404, data: { error: 'User not found' } }
      }

      const user = await User.findById(ctx.auth.sub)
        .select('username')
        .lean()

      // 5. Handle empty managed locations/roles
      if (permCtx.managedLocations.length === 0 && permCtx.managedRoles.length === 0) {
        const emptyResponse = {
          metadata: {
            userId: ctx.auth.sub,
            username: user?.username || '',
            effectiveDate: effectiveDate.toISOString(),
            validationTimestamp: new Date().toISOString(),
            managedLocationsCount: 0,
            managedRolesCount: 0
          },
          metrics: {
            totalEmployeeCount: 0,
            totalHours: 0,
            totalActiveEmployees: 0
          },
          locationBreakdown: [],
          roleBreakdown: []
        }

        return { status: 200, data: emptyResponse }
      }

      // 6. Get all enabled location-role pairs for user's managed resources
      const pairs: Array<{ locationId: string; roleId: string }> = []
      for (const locationId of permCtx.managedLocations) {
        for (const roleId of permCtx.managedRoles) {
          pairs.push({ locationId, roleId })
        }
      }

      // 7. Validate each location-role pair
      const validationResults = await validateLocationRolePairs(pairs, effectiveDate)

      // Filter to only valid pairs
      const validPairs = pairs.filter(pair => {
        const key = `${pair.locationId}:${pair.roleId}`
        return validationResults.get(key) === true
      })

      // 8. Query active role assignments for valid pairs
      const allAssignments = []
      for (const pair of validPairs) {
        const assignments = await getActiveRoleAssignments({
          locationId: pair.locationId,
          roleId: pair.roleId,
          effectiveDate
        })
        allAssignments.push(...assignments)
      }

      // 9. Aggregate metrics across all managed resources
      const employeePins = allAssignments.map(a => (a.employeeId as any).pin)
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

      // 10. Build location breakdown with role distribution
      const locationMap = new Map<string, {
        locationId: string
        locationName: string
        employeeCount: number
        totalHours: number
        roleDistribution: Array<{
          roleId: string
          roleName: string
          employeeCount: number
        }>
      }>()

      for (const assignment of allAssignments) {
        const locationId = String((assignment.locationId as any)._id)
        const locationName = (assignment.locationId as any).name
        const roleId = String((assignment.roleId as any)._id)
        const roleName = (assignment.roleId as any).name

        if (!locationMap.has(locationId)) {
          locationMap.set(locationId, {
            locationId,
            locationName,
            employeeCount: 0,
            totalHours: 0,
            roleDistribution: []
          })
        }

        const location = locationMap.get(locationId)!
        location.employeeCount += 1

        const existingRole = location.roleDistribution.find(r => r.roleId === roleId)
        if (existingRole) {
          existingRole.employeeCount += 1
        } else {
          location.roleDistribution.push({
            roleId,
            roleName,
            employeeCount: 1
          })
        }
      }

      const locationBreakdown = Array.from(locationMap.values())
        .sort((a, b) => b.employeeCount - a.employeeCount)

      // 11. Build role breakdown with location distribution
      const roleMap = new Map<string, {
        roleId: string
        roleName: string
        roleColor?: string
        employeeCount: number
        totalHours: number
        locationDistribution: Array<{
          locationId: string
          locationName: string
          employeeCount: number
        }>
      }>()

      for (const assignment of allAssignments) {
        const roleId = String((assignment.roleId as any)._id)
        const roleName = (assignment.roleId as any).name
        const roleColor = (assignment.roleId as any).color
        const locationId = String((assignment.locationId as any)._id)
        const locationName = (assignment.locationId as any).name

        if (!roleMap.has(roleId)) {
          roleMap.set(roleId, {
            roleId,
            roleName,
            roleColor,
            employeeCount: 0,
            totalHours: 0,
            locationDistribution: []
          })
        }

        const role = roleMap.get(roleId)!
        role.employeeCount += 1

        const existingLocation = role.locationDistribution.find(l => l.locationId === locationId)
        if (existingLocation) {
          existingLocation.employeeCount += 1
        } else {
          role.locationDistribution.push({
            locationId,
            locationName,
            employeeCount: 1
          })
        }
      }

      const roleBreakdown = Array.from(roleMap.values())
        .sort((a, b) => b.employeeCount - a.employeeCount)

      // 12. Build response
      const response = {
        metadata: {
          userId: ctx.auth.sub,
          username: user?.username || '',
          effectiveDate: effectiveDate.toISOString(),
          validationTimestamp: new Date().toISOString(),
          managedLocationsCount: permCtx.managedLocations.length,
          managedRolesCount: permCtx.managedRoles.length
        },
        metrics: {
          totalEmployeeCount: uniquePins.length,
          totalHours: shiftData.totalHours,
          totalActiveEmployees: shiftData.activeEmployees
        },
        locationBreakdown,
        roleBreakdown
      }

      // 13. Cache and return
      dashboardCache.set(cacheKey, response)

      return { status: 200, data: response }

    } catch (err) {
      console.error('[api/dashboard/user/stats GET]', err)
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