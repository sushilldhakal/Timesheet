import { connectDB, User } from "@/lib/db";
import { createAuthToken, setAuthCookie, getAuthFromCookie } from "@/lib/auth/auth-helpers";

export class AuthService {
  async login(body: any) {
    const { email, password } = body;
    const normalizedEmail = email.trim().toLowerCase();

    await connectDB();
    const user = await User.findOne({ email: normalizedEmail }).select("+password").lean();
    if (!user || !(user as any).password) return { status: 401, data: { error: "Invalid email or password" } };

    const bcrypt = await import("bcrypt");
    const passwordMatch = await bcrypt.compare(password, (user as any).password);
    if (!passwordMatch) return { status: 401, data: { error: "Invalid email or password" } };

    const token = await createAuthToken({
      sub: String((user as any)._id),
      email: (user as any).email,
      role: (user as any).role,
      location: Array.isArray((user as any).location) ? (user as any).location[0] ?? "" : ((user as any).location ?? ""),
    });
    await setAuthCookie(token);

    const loc = (user as any).location;
    const location = Array.isArray(loc) ? loc : loc ? [loc] : [];

    return {
      status: 200,
      data: {
        user: {
          id: String((user as any)._id),
          name: (user as any).name ?? "",
          email: (user as any).email,
          role: (user as any).role,
          location,
          rights: (((user as any).rights ?? []) as any[]).map((right) => String(right)),
        },
      },
    };
  }

  async me() {
    const auth = await getAuthFromCookie();
    if (!auth) return { status: 401, data: { error: "Not authenticated" } };

    await connectDB();
    const user = await User.findById(auth.sub).select("-password").lean();
    if (!user) return { status: 401, data: { error: "User not found" } };

    const location = Array.isArray((user as any).location)
      ? (user as any).location
      : (user as any).location
        ? [String((user as any).location)]
        : [];

    const role = (user as any).role ?? auth.role ?? ((user as any).username === "admin" ? "admin" : "user");

    return {
      status: 200,
      data: {
        user: {
          id: String((user as any)._id),
          name: (user as any).name ?? "",
          username: (user as any).username,
          role,
          location,
          rights: (((user as any).rights ?? []) as any[]).map((right) => String(right)),
          managedRoles: (((user as any).managedRoles ?? []) as any[]).map((r) => String(r)),
        },
      },
    };
  }
}

export const authService = new AuthService();

