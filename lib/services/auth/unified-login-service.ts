import { connectDB, User, Employee } from "@/lib/db";
import { createAuthToken, setAuthCookie } from "@/lib/auth/auth-helpers";

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
          const token = await createAuthToken({
            sub: String((user as any)._id),
            email: (user as any).email,
            role: (user as any).role,
            location: Array.isArray((user as any).location) ? (user as any).location[0] : (user as any).location,
            tenantId: (user as any).tenantId ? String((user as any).tenantId) : undefined,
          });
          await setAuthCookie(token);
          return {
            success: true,
            userType: "admin" as const,
            redirect: "/dashboard",
            user: {
              id: (user as any)._id,
              name: (user as any).name,
              email: (user as any).email,
              role: (user as any).role,
              location: (user as any).location,
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
        const token = await createAuthToken({
          sub: String((user as any)._id),
          email: (user as any).email,
          role: (user as any).role,
          location: Array.isArray((user as any).location) ? (user as any).location[0] : (user as any).location,
          tenantId: (user as any).tenantId ? String((user as any).tenantId) : undefined,
        });
        await setAuthCookie(token);
        return {
          success: true,
          userType: "admin" as const,
          redirect: "/dashboard",
          user: {
            id: (user as any)._id,
            name: (user as any).name,
            email: (user as any).email,
            role: (user as any).role,
            location: (user as any).location,
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

