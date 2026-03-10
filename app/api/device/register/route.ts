import { connectDB, User, Device } from "@/lib/db"
import { createDeviceToken, setDeviceCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { logDeviceRegistrationFailure } from "@/lib/auth/auth-logger"
import { createApiRoute } from "@/lib/api/create-api-route"
import { deviceRegisterSchema, deviceRegisterResponseSchema } from "@/lib/validations/device-register"
import { errorResponseSchema } from "@/lib/validations/auth"

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/device/register',
  summary: 'Register device',
  description: 'Register a new device with admin credentials and location information',
  tags: ['Devices'],
  security: 'none',
  request: {
    body: deviceRegisterSchema
  },
  responses: {
    200: deviceRegisterResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      if (!body) {
        return {
          status: 400,
          data: { error: "Request body is required" }
        };
      }

      const { email, password, locationName, locationAddress } = body;

      // Validate location name is provided
      if (!locationName || typeof locationName !== "string" || !locationName.trim()) {
        logDeviceRegistrationFailure("Missing or invalid location name")
        return {
          status: 400,
          data: { error: "Location name is required" }
        };
      }

      await connectDB()

      // Authenticate admin using email+password
      let adminUser = null

      if (email && password) {
        // Email + password authentication
        const normalizedInput = email.trim().toLowerCase()
        const bcrypt = await import("bcrypt")
        
        // Try to find user by email or username
        adminUser = await User.findOne({ 
          $or: [
            { email: normalizedInput },
            { username: normalizedInput }
          ]
        })
          .select("+password")
          .lean()

        if (process.env.NODE_ENV === "development") {
          console.log("[device/register] Looking for user:", normalizedInput)
          console.log("[device/register] User found:", !!adminUser)
          if (adminUser) {
            console.log("[device/register] User details:", {
              id: adminUser._id,
              email: adminUser.email,
              username: adminUser.username,
              role: adminUser.role
            })
          }
        }

        if (!adminUser || !adminUser.password) {
          logDeviceRegistrationFailure("Invalid credentials - user not found", { email: normalizedInput })
          return {
            status: 401,
            data: { error: "Invalid email or password. Please check your credentials." }
          };
        }

        const passwordMatch = await bcrypt.compare(password, adminUser.password)

        if (process.env.NODE_ENV === "development") {
          console.log("[device/register] Password match:", passwordMatch)
          console.log("[device/register] User role:", adminUser.role)
        }

        if (!passwordMatch) {
          logDeviceRegistrationFailure("Invalid password", { email: normalizedInput })
          return {
            status: 401,
            data: { error: "Invalid email or password. Please check your credentials." }
          };
        }

        // Verify user is admin or super_admin
        if (!isAdminOrSuperAdmin(adminUser.role)) {
          if (process.env.NODE_ENV === "development") {
            console.log("[device/register] User role check failed:", {
              userRole: adminUser.role,
              isAdmin: adminUser.role === "admin",
              isSuperAdmin: adminUser.role === "super_admin",
              isAdminOrSuperAdmin: isAdminOrSuperAdmin(adminUser.role)
            })
          }
          logDeviceRegistrationFailure("Insufficient permissions", { email: normalizedInput, role: adminUser.role })
          return {
            status: 403,
            data: { error: "Access denied. Only administrators can register devices. Please use an admin account." }
          };
        }
      } else {
        logDeviceRegistrationFailure("Missing authentication credentials")
        return {
          status: 400,
          data: { error: "Email and password required" }
        };
      }

      // Generate unique device ID using crypto.randomUUID()
      const deviceId = crypto.randomUUID()

      // Create Device record in database
      const device = await Device.create({
        deviceId,
        locationName: locationName.trim(),
        locationAddress: locationAddress?.trim() || "",
        status: "active",
        registeredBy: adminUser._id,
        registeredAt: new Date(),
        lastActivity: new Date(),
      })

      // Generate device token
      const token = await createDeviceToken({
        sub: deviceId,
        location: locationName.trim(),
      })

      // Set httpOnly cookie
      await setDeviceCookie(token)

      return {
        status: 200,
        data: {
          success: true,
          deviceId: device.deviceId,
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("[device/register]", err)
      }
      logDeviceRegistrationFailure("Registration exception", { error: err instanceof Error ? err.message : "Unknown error" })
      return {
        status: 500,
        data: { error: "Registration failed" }
      }
    }
  }
});
