import { connectDB, User } from "@/lib/db";
import { setAuthCookie, getAuthFromCookie } from "@/lib/auth/auth-helpers";
import { Employer } from "@/lib/db/schemas/employer";
import { UserTenant } from "@/lib/db/schemas/user-tenant";
import { createFullAuthToken, createPreAuthToken, setPreAuthCookie, clearPreAuthCookie } from "@/lib/auth/tenant-context";

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

    const userId = String((user as any)._id)
    const memberships = await UserTenant.find({ userId: (user as any)._id, isActive: true })
      .select("tenantId role location managedRoles")
      .lean()

    // Backward-compat: if the join table isn't populated yet, fall back to legacy user.tenantId
    const effectiveMemberships =
      memberships.length > 0
        ? memberships
        : (user as any).tenantId
          ? [
              {
                tenantId: (user as any).tenantId,
                role: (user as any).role ?? "user",
                location: Array.isArray((user as any).location) ? (user as any).location : [],
                managedRoles: Array.isArray((user as any).managedRoles) ? (user as any).managedRoles : [],
              },
            ]
          : []

    if (effectiveMemberships.length > 1) {
      const tenantIds = effectiveMemberships.map((m: any) => String(m.tenantId))
      const employers = await Employer.find({ _id: { $in: tenantIds } }).select("name").lean()
      const employersById = new Map(employers.map((e: any) => [String((e as any)._id), e]))

      const preauth = await createPreAuthToken({
        sub: userId,
        email: (user as any).email,
        name: (user as any).name ?? "",
      })
      await setPreAuthCookie(preauth)

      return {
        status: 200,
        data: {
          requiresOrgSelection: true,
          orgs: tenantIds
            .map((id) => {
              const employer = employersById.get(id) as any
              if (!employer) return null
              const name = String(employer.name ?? "")
              const slug = name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
              return { id, name, slug }
            })
            .filter(Boolean),
        },
      }
    }

    await clearPreAuthCookie()

    // Super admin with no memberships — issue sentinel token directly
    if ((user as any).role === "super_admin" && effectiveMemberships.length === 0) {
      const token = await createFullAuthToken({
        sub: userId,
        email: (user as any).email,
        name: (user as any).name ?? "",
        tenantId: "__super_admin__",
        role: "super_admin",
        locations: [],
        managedRoles: [],
      })
      await setAuthCookie(token)
      return {
        status: 200,
        data: {
          user: {
            id: userId,
            name: (user as any).name ?? "",
            email: (user as any).email,
            role: "super_admin",
            location: [],
            rights: [],
          },
        },
      }
    }

    const membership = effectiveMemberships[0] as any | undefined
    const tenantId = membership?.tenantId ? String(membership.tenantId) : ((user as any).tenantId ? String((user as any).tenantId) : "")
    const role = String(membership?.role ?? (user as any).role ?? "user")
    const locations = Array.isArray(membership?.location)
      ? membership.location.map(String).filter(Boolean)
      : Array.isArray((user as any).location)
        ? (user as any).location.map(String).filter(Boolean)
        : []
    const managedRoles = Array.isArray(membership?.managedRoles)
      ? membership.managedRoles.map(String).filter(Boolean)
      : Array.isArray((user as any).managedRoles)
        ? (user as any).managedRoles.map(String).filter(Boolean)
        : []

    const token = await createFullAuthToken({
      sub: userId,
      email: (user as any).email,
      name: (user as any).name ?? "",
      tenantId,
      role,
      locations,
      managedRoles,
    })
    await setAuthCookie(token);

    return {
      status: 200,
      data: {
        user: {
          id: userId,
          name: (user as any).name ?? "",
          email: (user as any).email,
          role,
          location: locations,
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

    const role = (user as any).role ?? auth.role ?? "user";

    // Fetch tenantName from Employer — tenantId comes from JWT (no extra User query needed)
    const tenantId = auth.tenantId ?? null
    let tenantName: string | null = null
    
    // Super admin has sentinel tenantId, not a real employer ID
    if (tenantId && tenantId !== "__super_admin__") {
      const employer = await Employer.findById(tenantId).select("name").lean()
      tenantName = (employer as any)?.name ?? null
    } else if (tenantId === "__super_admin__") {
      tenantName = "Super Admin"
    }

    return {
      status: 200,
      data: {
        user: {
          id: String((user as any)._id),
          name: (user as any).name ?? "",
          email: (user as any).email ?? "",
          role,
          location,
          rights: (((user as any).rights ?? []) as any[]).map((right) => String(right)),
          managedRoles: (((user as any).managedRoles ?? []) as any[]).map((r) => String(r)),
          tenantId: tenantId ?? undefined,
          tenantName: tenantName ?? undefined,
        },
      },
    };
  }
}

export const authService = new AuthService();

