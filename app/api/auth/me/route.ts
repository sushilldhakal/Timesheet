import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { connectDB, User } from "@/lib/db"
import { meResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/auth/me',
  summary: 'Get current user',
  description: 'Get current authenticated user information',
  tags: ['Auth'],
  security: 'adminAuth',
  responses: {
    200: meResponseSchema,
    401: errorResponseSchema
  },
  handler: async () => {
    const auth = await getAuthFromCookie();
    if (!auth) {
      return {
        status: 401,
        data: { error: "Not authenticated" }
      };
    }

    try {
      await connectDB();
      const user = await User.findById(auth.sub)
        .select("-password")
        .lean();

      if (!user) {
        return {
          status: 401,
          data: { error: "User not found" }
        };
      }

      // Normalize location to array (legacy support)
      const location = Array.isArray(user.location)
        ? user.location
        : user.location
          ? [String(user.location)]
          : [];

      // Ensure role is always returned (legacy users may lack role; infer admin from username)
      const role =
        user.role ?? auth.role ?? (user.username === "admin" ? "admin" : "user");

      return {
        status: 200,
        data: {
          user: {
            id: String(user._id),
            name: user.name ?? "",
            username: user.username,
            role,
            location,
            rights: (user.rights ?? []).map(right => String(right)),
            managedRoles: (user.managedRoles ?? []).map(role => String(role)),
          },
        }
      };
    } catch {
      return {
        status: 401,
        data: { error: "Authentication failed" }
      };
    }
  }
});
