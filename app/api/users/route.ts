import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, User } from "@/lib/db"
import { userCreateSchema, usersListResponseSchema, userCreateResponseSchema } from "@/lib/validations/user"
import { errorResponseSchema } from "@/lib/validations/auth"
import { isAdminOrSuperAdmin, canCreateUser } from "@/lib/config/roles"
import { createApiRoute } from "@/lib/api/create-api-route"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/users',
  summary: 'List users',
  description: 'List users based on caller scope. Admin/super_admin see all (except super_admin), manager sees supervisors in their locations, supervisor/accounts see nothing.',
  tags: ['Users'],
  security: 'adminAuth',
  responses: {
    200: usersListResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }

    try {
      await connectDB()
      
      let query: any = { role: { $ne: "super_admin" } } // Always exclude super_admin from results
      
      // Apply role-based filtering
      if (auth.role === 'admin' || auth.role === 'super_admin') {
        // Admin and super_admin see all users (except super_admin which is already excluded)
        // No additional filtering needed
      } else if (auth.role === 'manager') {
        // Manager sees supervisors in their locations only
        // First get the full user data to access their complete location array
        const authUser = await User.findById(auth.sub).select('location').lean();
        if (!authUser) {
          return {
            status: 401,
            data: { error: "Authentication user not found" }
          };
        }
        
        const authLocations = Array.isArray(authUser.location) ? authUser.location : authUser.location ? [authUser.location] : [];
        
        // Filter to supervisors that have at least one location in common with the manager
        query = {
          ...query,
          role: 'supervisor',
          location: { $in: authLocations }
        };
      } else {
        // Supervisor and accounts cannot see any users (no user creation rights)
        // Return empty array
        return {
          status: 200,
          data: { users: [] }
        };
      }

      const users = await User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .lean()

      const normalized = users.map((u: any) => ({
        id: u._id.toString(),
        name: u.name ?? "",
        username: u.username,
        email: u.email ?? "",
        role: u.role,
        location: Array.isArray(u.location) ? u.location : u.location ? [String(u.location)] : [],
        rights: u.rights ?? [],
        managedRoles: u.managedRoles ?? [],
        createdAt: u.createdAt,
      }))

      return {
        status: 200,
        data: { users: normalized }
      };
    } catch (err) {
      console.error("[api/users GET]", err)
      return {
        status: 500,
        data: { error: "Failed to fetch users" }
      };
    }
  }
});

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/users',
  summary: 'Create user',
  description: 'Create user (admin only)',
  tags: ['Users'],
  security: 'adminAuth',
  request: {
    body: userCreateSchema,
  },
  responses: {
    200: userCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return {
        status: 401,
        data: { error: "Unauthorized" }
      };
    }
    
    // Use role hierarchy enforcement instead of isAdminOrSuperAdmin
    if (!canCreateUser(auth.role, body?.role || 'user')) {
      return {
        status: 403,
        data: { error: "Forbidden: Cannot create user with this role" }
      };
    }

    try {
      const { name, username, email, password, role, location, rights, managedRoles, employeeId } = body!;
      console.log('[POST /api/users] Parsed data - managedRoles:', managedRoles)

      await connectDB()

      // Check for existing username
      const existingUser = await User.findOne({ username: username.toLowerCase() })
      if (existingUser) {
        return {
          status: 409,
          data: { error: "Username already exists" }
        };
      }

      // Check for existing email if provided
      if (email) {
        const existingEmail = await User.findOne({ email: email.toLowerCase() })
        if (existingEmail) {
          return {
            status: 409,
            data: { error: "Email already exists" }
          };
        }
      }

      // Additional validation: manager creating supervisor must have body.location subset of auth.location
      if (auth.role === 'manager' && role === 'supervisor') {
        // Get the full user data to access their complete location array
        const authUser = await User.findById(auth.sub).select('location').lean();
        if (!authUser) {
          return {
            status: 401,
            data: { error: "Authentication user not found" }
          };
        }
        
        const authLocations = Array.isArray(authUser.location) ? authUser.location : authUser.location ? [authUser.location] : [];
        const targetLocations = location || [];
        
        // Check if target locations are a subset of auth locations
        const isSubset = targetLocations.every((loc: string) => authLocations.includes(loc));
        if (!isSubset) {
          return {
            status: 403,
            data: { error: "Cannot assign locations outside your scope" }
          };
        }
      }

      let userPassword = password

      // If promoting from staff, verify employee exists and copy their password
      if (employeeId) {
        const { Employee } = await import("@/lib/db")
        const employee = await Employee.findById(employeeId).select("+password")
        if (!employee) {
          return {
            status: 404,
            data: { error: "Employee not found" }
          };
        }
        if (email && employee.email?.toLowerCase() !== email.toLowerCase()) {
          return {
            status: 400,
            data: { error: "Email must match employee email" }
          };
        }
        if (!employee.password) {
          return {
            status: 400,
            data: { error: "Employee must have a password set to be promoted" }
          };
        }
        
        // Copy the employee's hashed password directly
        userPassword = employee.password
      }

      // Validate that we have a password (either provided or copied from employee)
      if (!userPassword) {
        return {
          status: 400,
          data: { error: "Password is required" }
        };
      }

      const now = Math.floor(Date.now() / 1000) // Unix timestamp in seconds

      const user = await User.create({
        name: name.trim(),
        username: username.toLowerCase(),
        email: email?.toLowerCase() || undefined,
        password: userPassword, // This will be hashed by the pre-save hook if it's not already hashed
        role: role ?? "user",
        location: location ?? [],
        rights: rights ?? [],
        managedRoles: managedRoles ?? [],
        createdBy: auth.sub, // Set createdBy to the creating user's ID
        createdAt: now,
        updatedAt: now,
      })

      console.log('[POST /api/users] Created user with managedRoles:', user.managedRoles)

      return {
        status: 200,
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            location: user.location ?? [],
            rights: user.rights ?? [],
            managedRoles: user.managedRoles ?? [],
            createdBy: user.createdBy,
            createdAt: user.createdAt,
          },
        }
      };
    } catch (err) {
      console.error("[api/users POST]", err)
      return {
        status: 500,
        data: { error: "Failed to create user" }
      };
    }
  }
});
