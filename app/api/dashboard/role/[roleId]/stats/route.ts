import { NextResponse } from 'next/server'
import { getAuthWithUserLocations } from '@/lib/auth/auth-api'
import { connectDB, Category } from '@/lib/db'
import { dashboardCache } from '@/lib/utils/dashboard-cache'
import { 
  getUserPermissionContext, 
  canViewRole 
} from '@/lib/utils/dashboard-permissions'
import { getEnabledLocationsForRole } from '@/lib/utils/dashboard-validation'
import { 
  getActiveRoleAssignments,
  aggregateShiftData 
} from '@/lib/utils/dashboard-queries'
import mongoose from 'mongoose'

const { ObjectId } = mongoose.Types

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    // 1. Authentication
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Await params and validate ObjectId format
    const { roleId } = await params
    if (!ObjectId.isValid(roleId)) {
      return NextResponse.json(
        { 
          error: 'Invalid role ID format',
          code: 'INVALID_OBJECT_ID'
        },
        { status: 400 }
      )
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    let effectiveDate = new Date()
    
    if (dateParam) {
      const parsed = new Date(dateParam)
      if (isNaN(parsed.getTime())) {
        return NextResponse.json(
          {
            error: 'Invalid date parameter',
            code: 'INVALID_DATE_FORMAT',
            details: {
              provided: dateParam,
              expected: 'ISO 8601 date string (e.g., 2024-01-15)'
            }
          },
          { status: 400 }
        )
      }
      effectiveDate = parsed
    }

    // 4. Check cache
    const cacheKey = dashboardCache.generateKey(
      `/api/dashboard/role/${roleId}/stats`,
      { date: dateParam || undefined }
    )
    
    const cached = dashboardCache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes
          'X-Cache': 'HIT'
        }
      })
    }

    await connectDB()

    // 5. Authorization
    const permCtx = await getUserPermissionContext(ctx.auth.sub)
    if (!permCtx || !canViewRole(permCtx, roleId)) {
      console.warn('[SECURITY] Unauthorized access attempt', {
        userId: ctx.auth.sub,
        resource: 'role',
        resourceId: roleId,
        timestamp: new Date().toISOString()
      })
      
      return NextResponse.json(
        { 
          error: 'Forbidden: You do not have permission to view this role',
          code: 'INSUFFICIENT_PERMISSIONS'
        },
        { status: 403 }
      )
    }

    // 6. Verify role exists
    const role = await Category.findById(roleId)
      .select('name type color')
      .lean()
    
    if (!role || role.type !== 'role') {
      return NextResponse.json(
        { 
          error: 'Role not found',
          code: 'RESOURCE_NOT_FOUND',
          details: { resourceType: 'role', resourceId: roleId }
        },
        { status: 404 }
      )
    }

    // 7. Get enabled locations for this role
    const enabledLocationIds = await getEnabledLocationsForRole(
      roleId,
      effectiveDate
    )

    // 8. Get active role assignments
    const assignments = await getActiveRoleAssignments({
      roleId,
      effectiveDate
    })

    // Filter assignments to only enabled locations
    const filteredAssignments = assignments.filter(a =>
      enabledLocationIds.includes(String((a.locationId as any)._id))
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

    // 10. Build location distribution
    const locationMap = new Map<string, {
      locationId: string
      locationName: string
      employeeCount: number
      totalHours: number
    }>()

    for (const assignment of filteredAssignments) {
      const locationId = String((assignment.locationId as any)._id)
      const locationName = (assignment.locationId as any).name
      
      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, {
          locationId,
          locationName,
          employeeCount: 0,
          totalHours: 0
        })
      }
      
      locationMap.get(locationId)!.employeeCount += 1
    }

    const locationDistribution = Array.from(locationMap.values())
      .sort((a, b) => b.employeeCount - a.employeeCount)

    // 11. Build response
    const response = {
      metadata: {
        roleId,
        roleName: role.name,
        roleColor: role.color,
        effectiveDate: effectiveDate.toISOString(),
        validationTimestamp: new Date().toISOString(),
        filters: {
          role: roleId,
          ...(dateParam && { date: dateParam })
        }
      },
      metrics: {
        employeeCount: uniquePins.length,
        totalHours: shiftData.totalHours,
        activeEmployees: shiftData.activeEmployees,
        locationDistribution
      },
      dailyTimeline: shiftData.dailyTimeline
    }

    // 12. Cache and return
    dashboardCache.set(cacheKey, response)

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'X-Cache': 'MISS'
      }
    })

  } catch (err) {
    console.error('[api/dashboard/role/stats GET]', err)
    return NextResponse.json(
      { 
        error: 'Failed to load dashboard statistics',
        code: 'DATABASE_ERROR'
      },
      { status: 500 }
    )
  }
}
