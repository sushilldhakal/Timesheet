/**
 * Better Auth Configuration
 * 
 * This replaces the manual JWT handling in auth.ts, employee-auth.ts, and device-auth.ts
 * while keeping the exact same authentication flows and cookie names.
 */

import { betterAuth } from "better-auth"
import { mongodbAdapter } from "@better-auth/mongo-adapter"
import { jwt } from "better-auth/plugins/jwt"
import { bearer } from "better-auth/plugins/bearer"
import mongoose from "mongoose"

const IS_PRODUCTION = process.env.NODE_ENV === "production"

export const auth = betterAuth({
  // Use existing MongoDB connection
  database: mongodbAdapter(mongoose.connection),
  
  // Use existing JWT_SECRET
  secret: process.env.JWT_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  
  // Disable default email/password to use custom flows
  emailAndPassword: {
    enabled: false,
  },
  
  // Custom cookie configuration to match existing setup
  advanced: {
    cookiePrefix: "", // No prefix to match existing cookie names
    useSecureCookies: IS_PRODUCTION,
    
    // Custom cookie names to match existing implementation
    cookies: {
      session_token: {
        name: "auth_token", // Match existing admin/user cookie
        attributes: {
          httpOnly: true,
          secure: IS_PRODUCTION,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7, // 7 days
        }
      },
    },
    
    // Disable CSRF for API routes (handled by your existing logic)
    disableCSRFCheck: false,
  },
  
  // Session configuration matching existing setup
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (admin/user)
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 300, // 5 minutes
    }
  },
  
  // User model configuration
  user: {
    modelName: "user", // Match your existing User model
    additionalFields: {
      username: {
        type: "string",
        required: true,
        unique: true,
      },
      role: {
        type: "string",
        required: true,
      },
      location: {
        type: "string",
      },
      rights: {
        type: "string", // JSON array
      },
      managedRoles: {
        type: "string", // JSON array
      },
    }
  },
  
  plugins: [
    // JWT plugin for employee and device tokens
    jwt({
      jwt: {
        // Custom JWT configuration for different token types
        definePayload: ({ user, session }) => {
          // This will be customized per token type in helper functions
          return {
            id: user.id,
            type: session?.type || "user",
          }
        },
      },
      jwks: {
        keyPairConfig: {
          alg: "HS256", // Match existing algorithm
        },
      }
    }),
    
    // Bearer plugin for API authentication
    bearer(),
  ],
  
  // Disable default paths since we use custom routes
  disabledPaths: [
    "/sign-up/email",
    "/sign-in/email",
    "/sign-out",
  ],
})

// Export types for compatibility with existing code
export type AuthPayload = {
  sub: string
  username: string
  role: "admin" | "user" | "super_admin"
  location?: string
}

export type EmployeeAuthPayload = {
  sub: string
  pin: string
  type: "employee"
}

export type DeviceAuthPayload = {
  sub: string
  location: string
  type: "device"
}
