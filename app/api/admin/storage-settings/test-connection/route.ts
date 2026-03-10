import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3"
import { connectDB } from "@/lib/db"
import { StorageSettings } from "@/lib/db/schemas/storage-settings"
import { decrypt } from "@/lib/utils/storage/encryption"
import { createApiRoute } from "@/lib/api/create-api-route"
import { z } from "zod"

// Request schema
const testConnectionRequestSchema = z.object({
  provider: z.enum(["r2", "cloudinary"]),
  credentials: z.record(z.string(), z.any())
})

// Response schemas
const testConnectionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
})

const errorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional()
})

/** POST /api/admin/storage-settings/test-connection - Test storage provider connection */
export const POST = createApiRoute({
  method: 'POST',
  path: '/api/admin/storage-settings/test-connection',
  summary: 'Test storage provider connection',
  description: 'Test connection to storage provider (R2 or Cloudinary)',
  tags: ['admin'],
  security: 'adminAuth',
  request: {
    body: testConnectionRequestSchema
  },
  responses: {
    200: testConnectionResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    try {
      const auth = await getAuthFromCookie()
      if (!auth) {
        return { status: 401, data: { error: "Unauthorized" } }
      }
      if (!isAdminOrSuperAdmin(auth.role)) {
        return { status: 403, data: { error: "Forbidden" } }
      }

      const { provider, credentials } = body!

      // If credentials contain "existing", fetch from database
      let actualCredentials = credentials
      if (
        (provider === "r2" && credentials.secretAccessKey === "existing") ||
        (provider === "cloudinary" && credentials.apiSecret === "existing")
      ) {
        await connectDB()
        const settings = await StorageSettings.findOne({ isActive: true }).lean()
        
        if (!settings) {
          return {
            status: 400,
            data: { error: "No storage settings found in database" }
          }
        }

        if (provider === "r2") {
          if (!settings.r2SecretAccessKey) {
            return {
              status: 400,
              data: { error: "No R2 secret found in database. Please save your R2 credentials first." }
            }
          }
          
          // Use credentials from database for fields that aren't provided
          actualCredentials = {
            accountId: credentials.accountId || settings.r2AccountId,
            accessKeyId: credentials.accessKeyId || settings.r2AccessKeyId,
            bucketName: credentials.bucketName || settings.r2BucketName,
            secretAccessKey: decrypt(settings.r2SecretAccessKey),
          }
          
          console.log("Testing R2 with credentials:", {
            accountId: actualCredentials.accountId,
            accessKeyId: actualCredentials.accessKeyId,
            bucketName: actualCredentials.bucketName,
            hasSecret: !!actualCredentials.secretAccessKey,
          })
        } else if (provider === "cloudinary") {
          if (!settings.cloudinaryApiSecret) {
            return {
              status: 400,
              data: { error: "No Cloudinary secret found in database. Please save your Cloudinary credentials first." }
            }
          }
          
          // Use credentials from database for fields that aren't provided
          actualCredentials = {
            cloudName: credentials.cloudName || settings.cloudinaryCloudName,
            apiKey: credentials.apiKey || settings.cloudinaryApiKey,
            apiSecret: decrypt(settings.cloudinaryApiSecret),
          }
          
          console.log("Testing Cloudinary with credentials:", {
            cloudName: actualCredentials.cloudName,
            apiKey: actualCredentials.apiKey,
            hasSecret: !!actualCredentials.apiSecret,
          })
        }
      }

      if (provider === "r2") {
        // Test Cloudflare R2 connection
        const { accountId, accessKeyId, secretAccessKey, bucketName } = actualCredentials

        console.log("R2 Test - Credentials check:", {
          hasAccountId: !!accountId,
          hasAccessKeyId: !!accessKeyId,
          hasSecretAccessKey: !!secretAccessKey,
          hasBucketName: !!bucketName,
        })

        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
          const missing = []
          if (!accountId) missing.push("Account ID")
          if (!accessKeyId) missing.push("Access Key ID")
          if (!secretAccessKey) missing.push("Secret Access Key")
          if (!bucketName) missing.push("Bucket Name")
          
          return {
            status: 400,
            data: { error: `Missing R2 credentials: ${missing.join(", ")}` }
          }
        }

        try {
          const s3Client = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: {
              accessKeyId: accessKeyId as string,
              secretAccessKey: secretAccessKey as string,
            },
          })

          // Test connection by checking if bucket exists
          await s3Client.send(new HeadBucketCommand({ Bucket: bucketName as string }))

          return {
            status: 200,
            data: {
              success: true,
              message: "Successfully connected to Cloudflare R2",
            }
          }
        } catch (error: any) {
          console.error("R2 connection test failed:", error)
          return {
            status: 400,
            data: {
              error: "Failed to connect to Cloudflare R2",
              details: error.message || "Invalid credentials or bucket not found",
            }
          }
        }
      } else if (provider === "cloudinary") {
        // Test Cloudinary connection
        const { cloudName, apiKey, apiSecret } = actualCredentials

        console.log("Cloudinary Test - Credentials check:", {
          hasCloudName: !!cloudName,
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret,
        })

        if (!cloudName || !apiKey || !apiSecret) {
          const missing = []
          if (!cloudName) missing.push("Cloud Name")
          if (!apiKey) missing.push("API Key")
          if (!apiSecret) missing.push("API Secret")
          
          return {
            status: 400,
            data: { error: `Missing Cloudinary credentials: ${missing.join(", ")}` }
          }
        }

        try {
          // Test Cloudinary connection using their API
          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?max_results=1`,
            {
              headers: {
                Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
              },
            }
          )

          if (response.ok) {
            return {
              status: 200,
              data: {
                success: true,
                message: "Successfully connected to Cloudinary",
              }
            }
          } else {
            const errorData = await response.json()
            return {
              status: 400,
              data: {
                error: "Failed to connect to Cloudinary",
                details: errorData.error?.message || "Invalid credentials",
              }
            }
          }
        } catch (error: any) {
          console.error("Cloudinary connection test failed:", error)
          return {
            status: 400,
            data: {
              error: "Failed to connect to Cloudinary",
              details: error.message,
            }
          }
        }
      }

      return { status: 400, data: { error: "Invalid provider" } }
    } catch (error) {
      console.error("Connection test failed:", error)
      return { status: 500, data: { error: "Connection test failed" } }
    }
  }
});
