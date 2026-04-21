import { connectDB, User, Employee } from "@/lib/db";
import { setAuthCookie } from "@/lib/auth/auth-helpers";
import { Employer } from "@/lib/db/schemas/employer";
import { UserTenant } from "@/lib/db/schemas/user-tenant";
import { createFullAuthToken, createPreAuthToken, setPreAuthCookie, clearPreAuthCookie } from "@/lib/auth/tenant-context";
import { SUPER_ADMIN_SENTINEL } from "@/lib/auth/auth-constants";

export class UnifiedLoginService {
  private async employeeWebLogin(employee: any) {
    const { createEmployeeWebToken, setEmployeeWebCookie } = await import("@/lib/auth/auth-helpers");
    const token = await createEmployeeWebToken({ sub: String(employee._id), pin: employee.pin });
    await setEmployeeWebCookie(token);
  }

  async login(body: any) {
    const { email, password, loginAs } = body;
    const normalizedEmail = email.trim().toLowerCase();

    await connectDB();
    const bcrypt = await import("bcrypt");

    if (loginAs === "staff") {
      const employee = await Employee.findOne({ email: normalizedEmail }).select("+password").lean();
      if (employee && (employee as any).password) {
        const ok = await bcrypt.compare(password, (employee as any).password);
        if (ok) {
          await this.employeeWebLogin(employee);
          if ((employee as any).requirePasswordChange) {
            return { success: true, requirePasswordChange: true, userType: "employee" as const };
          }
          const locations = Array.isArray((employee as any).location) ? (employee as any).location : [];
          const employers = Array.isArray((employee as any).employer) ? (employee as any).employer : [];
          return {
            success: true,
            userType: "employee" as const,
            redirect: "/staff/dashboard",
            user: {
              id: (employee as any)._id,
              name: (employee as any).name,
              email: (employee as any).email,
              pin: (employee as any).pin,
              location: locations[0] || "",
              employer: employers[0] || "",
            },
          };
        }
      }
      return { status: 401, data: { error: "Invalid email or password" } };
    }

    if (loginAs === "admin") {
      const user = await User.findOne({ email: normalizedEmail }).select("+password").lean();
      if (user && (user as any).password) {
        const ok = await bcrypt.compare(password, (user as any).password);
        if (ok) {
          const userId = String((user as any)._id)
          const memberships = await UserTenant.find({ userId: (user as any)._id, isActive: true })
            .select("tenantId role location managedRoles")
            .lean()

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
              success: true,
              userType: "admin" as const,
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
            }
          }

          await clearPreAuthCookie()

          const membership = effectiveMemberships[0] as any | undefined
          const role = String(membership?.role ?? (user as any).role ?? "user")
          
          // Super admin gets sentinel tenantId
          const tenantId = role === "super_admin"
            ? SUPER_ADMIN_SENTINEL
            : membership?.tenantId
              ? String(membership.tenantId)
              : (user as any).tenantId
                ? String((user as any).tenantId)
                : ""
          
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
            success: true,
            userType: "admin" as const,
            redirect: "/dashboard",
            user: {
              id: (user as any)._id,
              name: (user as any).name,
              email: (user as any).email,
              role,
              location: locations,
              rights: (user as any).rights ?? [],
            },
          };
        }
      }
      return { status: 401, data: { error: "Invalid email or password" } };
    }

    // default: admin first, then employee
    const user = await User.findOne({ email: normalizedEmail }).select("+password").lean();
    if (user && (user as any).password) {
      const ok = await bcrypt.compare(password, (user as any).password);
      if (ok) {
        const userId = String((user as any)._id)
        const memberships = await UserTenant.find({ userId: (user as any)._id, isActive: true })
          .select("tenantId role location managedRoles")
          .lean()

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
            success: true,
            userType: "admin" as const,
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
          }
        }

        await clearPreAuthCookie()

        const membership = effectiveMemberships[0] as any | undefined
        const role = String(membership?.role ?? (user as any).role ?? "user")
        
        // Super admin gets sentinel tenantId
        const tenantId = role === "super_admin"
          ? SUPER_ADMIN_SENTINEL
          : membership?.tenantId
            ? String(membership.tenantId)
            : (user as any).tenantId
              ? String((user as any).tenantId)
              : ""
        
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
          success: true,
          userType: "admin" as const,
          redirect: "/dashboard",
          user: {
            id: (user as any)._id,
            name: (user as any).name,
            email: (user as any).email,
            role,
            location: locations,
            rights: (user as any).rights ?? [],
          },
        };
      }
    }

    const employee = await Employee.findOne({ email: normalizedEmail }).select("+password").lean();
    if (employee && (employee as any).password) {
      const ok = await bcrypt.compare(password, (employee as any).password);
      if (ok) {
        await this.employeeWebLogin(employee);
        if ((employee as any).requirePasswordChange) {
          return { success: true, requirePasswordChange: true, userType: "employee" as const };
        }
        const locations = Array.isArray((employee as any).location) ? (employee as any).location : [];
        const employers = Array.isArray((employee as any).employer) ? (employee as any).employer : [];
        return {
          success: true,
          userType: "employee" as const,
          redirect: "/staff/dashboard",
          user: {
            id: (employee as any)._id,
            name: (employee as any).name,
            email: (employee as any).email,
            pin: (employee as any).pin,
            location: locations[0] || "",
            employer: employers[0] || "",
          },
        };
      }
    }

    return { status: 401, data: { error: "Invalid email or password" } };
  }
}

export const unifiedLoginService = new UnifiedLoginService();

