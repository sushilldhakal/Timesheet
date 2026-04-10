import type { Right } from "@/lib/config/rights"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, User } from "@/lib/db"
import { 
  userIdParamSchema, 
  userAdminUpdateSchema, 
  userSelfUpdateSchema,
  singleUserResponseSchema,
  userUpdateResponseSchema,
  userDeleteResponseSchema,
} from "@/lib/validations/user"
import { errorResponseSchema } from "@/lib/validations/auth"
import { isAdminOrSuperAdmin, isSuperAdmin } from "@/lib/config/roles"
import { createApiRoute } from "@/lib/api/create-api-route"

/** GET /api/users/[id] - Get single user (admin or self) */
export const GET = createApiRoute({
  method: 'GET',
  path: '/api/users/{id}',
  summary: 'Get single user',
  description: 'Get single user (admin or self)',
  tags: ['users'],
  security: 'adminAuth',
  request: {
    params: userIdParamSchema
  },
  responses: {
    200: singleUserResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { id } = params!

    // User can only get their own profile unless admin/super_admin
    if (!isAdminOrSuperAdmin(auth.role) && auth.sub !== id) {
      return { status: 403, data: { error: "Forbidden" } }
    }

    try {
      await connectDB()
      const user = await User.findById(id).select("-password").lean()

      if (!user) {
        return { status: 404, data: { error: "User not found" } }
      }

      // Hide super_admin from admin (not from super_admin)
      if (user.role === "super_admin" && !isSuperAdmin(auth.role)) {
        return { status: 404, data: { error: "User not found" } }
      }

      const location = Array.isArray(user.location) ? user.location : user.location ? [String(user.location)] : []

      return {
        status: 200,
        data: {
          user: {
            id: user._id,
            name: user.name ?? "",
            email: user.email ?? "",
            role: user.role,
            location,
            rights: user.rights ?? [],
            managedRoles: user.managedRoles ?? [],
            createdAt: user.createdAt,
          },
        }
      }
    } catch (err) {
      console.error("[api/users/[id] GET]", err)
      return { status: 500, data: { error: "Failed to fetch user" } }
    }
  }
});

/** PATCH /api/users/[id] - Update user */
export const PATCH = createApiRoute({
  method: 'PATCH',
  path: '/api/users/{id}',
  summary: 'Update user',
  description: 'Update user (admin or self)',
  tags: ['users'],
  security: 'adminAuth',
  request: {
    params: userIdParamSchema,
    body: userAdminUpdateSchema.or(userSelfUpdateSchema)
  },
  responses: {
    200: userUpdateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body, params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }

    const { id } = params!
    const isSelf = auth.sub === id
    const isAdminOrSuper = isAdminOrSuperAdmin(auth.role)

    if (!isAdminOrSuper && !isSelf) {
      return { status: 403, data: { error: "Forbidden" } }
    }

    try {
      await connectDB()
      const existing = await User.findById(id).select("+password")
      if (!existing) {
        return { status: 404, data: { error: "User not found" } }
      }

      // Admin/super_admin cannot modify super_admin users
      if (existing.role === "super_admin" && !isSuperAdmin(auth.role)) {
        return { status: 403, data: { error: "Forbidden" } }
      }

      if (isAdminOrSuper) {
        // Admin: full update
        const parsedUpdate = userAdminUpdateSchema.safeParse(body)
        if (!parsedUpdate.success) {
          return {
            status: 400,
            data: { error: "Validation failed", issues: parsedUpdate.error.flatten().fieldErrors }
          }
        }

        const { name, email, password, role, location, managedRoles } = parsedUpdate.data

        if (email !== undefined) {
          const duplicate = await User.findOne({
            email: email.toLowerCase(),
            _id: { $ne: id },
          })
          if (duplicate) {
            return { status: 409, data: { error: "Email already exists" } }
          }
          existing.email = email.toLowerCase()
        }
        if (name !== undefined) existing.name = name.trim()
        if (password) existing.password = password
        if (role !== undefined) existing.role = role
        if (location !== undefined) existing.location = location
        if (managedRoles !== undefined) existing.managedRoles = managedRoles

        await existing.save()

        const u = await User.findById(id).select("-password").lean()
        const loc = u?.location
        const locArr = Array.isArray(loc) ? loc : loc ? [String(loc)] : []

        return {
          status: 200,
          data: {
            user: {
              id: u?._id,
              name: u?.name ?? "",
              email: u?.email ?? "",
              role: u?.role,
              location: locArr,
              rights: u?.rights ?? [],
              managedRoles: u?.managedRoles ?? [],
            },
          }
        }
      }

      // User: self-update (email and password only)
      const parsedSelf = userSelfUpdateSchema.safeParse(body)
      if (!parsedSelf.success) {
        return {
          status: 400,
          data: { error: "Validation failed", issues: parsedSelf.error.flatten().fieldErrors }
        }
      }

      const { email: newEmail, password } = parsedSelf.data

      if (newEmail) {
        const emailDuplicate = await User.findOne({
          email: newEmail.toLowerCase(),
          _id: { $ne: id },
        })
        if (emailDuplicate) {
          return { status: 409, data: { error: "Email already exists" } }
        }
        existing.email = newEmail.toLowerCase()
      }

      if (password) existing.password = password
      await existing.save()

      const u = await User.findById(id).select("-password").lean()
      const loc = u?.location
      const locArr = Array.isArray(loc) ? loc : loc ? [String(loc)] : []

      return {
        status: 200,
        data: {
          user: {
            id: u?._id,
            name: u?.name ?? "",
            email: u?.email ?? "",
            role: u?.role,
            location: locArr,
            rights: u?.rights ?? [],
          },
        }
      }
    } catch (err) {
      console.error("[api/users/[id] PATCH]", err)
      return { status: 500, data: { error: "Failed to update user" } }
    }
  }
});

/** DELETE /api/users/[id] - Delete user (admin only) */
export const DELETE = createApiRoute({
  method: 'DELETE',
  path: '/api/users/{id}',
  summary: 'Delete user',
  description: 'Delete user (admin only)',
  tags: ['users'],
  security: 'adminAuth',
  request: {
    params: userIdParamSchema
  },
  responses: {
    200: userDeleteResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ params }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return { status: 403, data: { error: "Forbidden" } }
    }

    const { id } = params!

    // Prevent admin from deleting themselves
    if (auth.sub === id) {
      return { status: 400, data: { error: "Cannot delete your own account" } }
    }

    try {
      await connectDB()
      const target = await User.findById(id).select("role").lean()
      if (!target) {
        return { status: 404, data: { error: "User not found" } }
      }
      if (target.role === "super_admin" && !isSuperAdmin(auth.role)) {
        return { status: 403, data: { error: "Forbidden" } }
      }
      const deleted = await User.findByIdAndDelete(id)
      if (!deleted) {
        return { status: 404, data: { error: "User not found" } }
      }
      return { status: 200, data: { success: true } }
    } catch (err) {
      console.error("[api/users/[id] DELETE]", err)
      return { status: 500, data: { error: "Failed to delete user" } }
    }
  }
});
