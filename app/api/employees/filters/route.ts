import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { getAuthWithUserLocations, employeeLocationFilter, getFilteredEmployeeIdsByRole } from "@/lib/auth/auth-api"
import { connectDB, Employee } from "@/lib/db"
import { createApiRoute } from "@/lib/api/create-api-route"
import { errorResponseSchema } from "@/lib/validations/auth"
import { z } from "zod"

const employeeFiltersResponseSchema = z.object({
  roles: z.array(z.object({
    name: z.string(),
    count: z.number()
  })),
  employers: z.array(z.object({
    name: z.string(),
    count: z.number()
  })),
  locations: z.array(z.object({
    name: z.string(),
    count: z.number()
  }))
})

/** GET /api/employees/filters - Get filter options with counts for employees */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/filters',
  summary: 'Get employee filter options',
  description: 'Get available filter options with employee counts for roles, employers, and locations',
  tags: ['Employees'],
  security: 'adminAuth',
  responses: {
    200: employeeFiltersResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async (data) => {
    const ctx = await getAuthWithUserLocations()
    if (!ctx) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      }
    }

    try {
      await connectDB()

      // Build base filter conditions (same as main employees endpoint)
      const andConditions: Record<string, unknown>[] = []
      const locFilter = employeeLocationFilter(ctx.userLocations)
      if (Object.keys(locFilter).length > 0) andConditions.push(locFilter)

      // Add role-based filtering
      const roleFilteredEmployeeIds = await getFilteredEmployeeIdsByRole(ctx.userLocations, ctx.managedRoles)
      if (roleFilteredEmployeeIds !== null) {
        // User has managed roles - filter to only those employees
        andConditions.push({ _id: { $in: roleFilteredEmployeeIds } })
      }

      const baseFilter: Record<string, unknown> = {}
      if (andConditions.length > 0) baseFilter.$and = andConditions

      // Get role counts via aggregation
      const { EmployeeRoleAssignment } = await import("@/lib/db/schemas/employee-role-assignment")
      const { Category } = await import("@/lib/db")

      // First get all employees that match the base filter
      const employeeIds = await Employee.find(baseFilter).distinct('_id')

      // Aggregate role counts
      const roleAggregation = await EmployeeRoleAssignment.aggregate([
        {
          $match: {
            employeeId: { $in: employeeIds },
            isActive: true
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'roleId',
            foreignField: '_id',
            as: 'role'
          }
        },
        {
          $unwind: '$role'
        },
        {
          $match: {
            'role.type': 'role'
          }
        },
        {
          $group: {
            _id: '$role.name',
            count: { $addToSet: '$employeeId' }
          }
        },
        {
          $project: {
            name: '$_id',
            count: { $size: '$count' }
          }
        },
        {
          $sort: { name: 1 }
        }
      ])

      // Aggregate employer counts
      const employerAggregation = await Employee.aggregate([
        { $match: baseFilter },
        { $unwind: { path: '$employer', preserveNullAndEmptyArrays: false } },
        {
          $lookup: {
            from: 'categories',
            localField: 'employer',
            foreignField: 'name',
            as: 'employerDetails'
          }
        },
        {
          $match: {
            'employerDetails.type': 'employer'
          }
        },
        {
          $group: {
            _id: '$employer',
            count: { $addToSet: '$_id' }
          }
        },
        {
          $project: {
            name: '$_id',
            count: { $size: '$count' }
          }
        },
        {
          $sort: { name: 1 }
        }
      ])

      // Aggregate location counts via role assignments
      const locationAggregation = await EmployeeRoleAssignment.aggregate([
        {
          $match: {
            employeeId: { $in: employeeIds },
            isActive: true
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'locationId',
            foreignField: '_id',
            as: 'location'
          }
        },
        {
          $unwind: '$location'
        },
        {
          $match: {
            'location.type': 'location'
          }
        },
        {
          $group: {
            _id: '$location.name',
            count: { $addToSet: '$employeeId' }
          }
        },
        {
          $project: {
            name: '$_id',
            count: { $size: '$count' }
          }
        },
        {
          $sort: { name: 1 }
        }
      ])

      return {
        status: 200,
        data: {
          roles: roleAggregation,
          employers: employerAggregation,
          locations: locationAggregation
        }
      }
    } catch (err) {
      console.error('Failed to fetch employee filters:', err)
      return {
        status: 500,
        data: { error: "Failed to fetch employee filters" }
      }
    }
  }
})