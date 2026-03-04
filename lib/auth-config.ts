import { betterAuth } from "better-auth"
import { mongodbAdapter } from "@better-auth/mongo-adapter"

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required")
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET environment variable is required")
}

export const auth = betterAuth({
  // MongoDB adapter configuration
  database: mongodbAdapter(process.env.MONGODB_URI),
  
  // Secret for signing tokens
  secret: process.env.BETTER_AUTH_SECRET,
  
  // Base URL for the application
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  
  // Session configuration - 2 hours (7200 seconds) for access tokens
  session: {
    expiresIn: 7200, // 2 hours in seconds
    updateAge: 0, // Don't update session on every request
  },

  // Email and password authentication (password flow)
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // For single-account integrations
  },

  // Advanced options for token management
  advanced: {
    generateId: () => {
      // Use crypto for secure token generation
      return crypto.randomUUID()
    },
  },

  // Trust proxy for production environments
  trustedOrigins: process.env.TRUSTED_ORIGINS?.split(",") || [],
})
