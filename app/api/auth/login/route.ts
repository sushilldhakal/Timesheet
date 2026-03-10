import { connectDB, User } from "@/lib/db"
import { createAuthToken, setAuthCookie } from "@/lib/auth/auth-helpers"
import { loginSchema, loginResponseSchema, errorResponseSchema } from "@/lib/validations/auth"
import { createApiRoute } from "@/lib/api/create-api-route"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/auth/login',
  summary: 'User login',
  description: 'Authenticate user with username and password',
  tags: ['Auth'],
  security: 'none',
  request: {
    body: loginSchema
  },
  responses: {
    200: loginResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async (data) => {
    try {
      const { body } = data;
      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        };
      }
      
      const { username, password } = body;
      const normalizedUsername = username.trim().toLowerCase();

      await connectDB();
      const user = await User.findOne({ username: normalizedUsername })
        .select("+password")
        .lean();

      if (!user || !user.password) {
        return {
          status: 401,
          data: { error: "Invalid username or password" }
        };
      }

      const bcrypt = await import("bcrypt");
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return {
          status: 401,
          data: { error: "Invalid username or password" }
        };
      }

      const token = await createAuthToken({
        sub: String(user._id),
        username: user.username,
        role: user.role,
        location: Array.isArray(user.location) ? user.location[0] ?? "" : (user.location ?? ""),
      });

      await setAuthCookie(token);

      const loc = user.location;
      const location = Array.isArray(loc) ? loc : loc ? [loc] : [];

      return {
        status: 200,
        data: {
          user: {
            id: String(user._id),
            name: user.name ?? "",
            username: user.username,
            role: user.role,
            location,
            rights: (user.rights ?? []).map(right => String(right)),
          },
        }
      };
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error("[auth/login]", err);
      }
      return {
        status: 500,
        data: { error: "Login failed" }
      };
    }
  }
});
