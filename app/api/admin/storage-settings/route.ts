import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { connectDB } from "@/lib/db"
import { StorageSettings } from "@/lib/db/schemas/storage-settings"
import { encrypt, decrypt, maskSecret } from "@/lib/utils/storage/encryption"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  storageSettingsUpdateSchema,
  storageSettingsResponseSchema,
  storageSettingsCreateResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema, successResponseSchema } from "@/lib/validations/auth"

const getStorageSettings = createApiRoute({
  method: 'GET',
  path: '/api/admin/storage-settings',
  summary: 'Get current storage settings',
  description: 'Get current storage settings with masked secrets for both Cloudinary and R2 providers',
  tags: ['Admin'],
  security: 'adminAuth',
  responses: {
    200: storageSettingsResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return { status: 403, data: { error: "Forbidden" } }
    }

    await connectDB()
    const settings = await StorageSettings.findOne({ isActive: true }).lean()

    if (!settings) {
      return { status: 200, data: { settings: null } }
    }

    // Return settings with masked secrets for BOTH providers
    const response: any = {
      provider: settings.provider,
      isActive: settings.isActive,
    }

    // Always return Cloudinary settings if they exist
    if (settings.cloudinaryCloudName) {
      response.cloudinary = {
        cloudName: settings.cloudinaryCloudName || "",
        apiKey: settings.cloudinaryApiKey || "",
        apiSecret: settings.cloudinaryApiSecret ? maskSecret(decrypt(settings.cloudinaryApiSecret)) : "",
        hasSecret: !!settings.cloudinaryApiSecret,
      }
    }

    // Always return R2 settings if they exist
    if (settings.r2AccountId) {
      response.r2 = {
        accountId: settings.r2AccountId || "",
        accessKeyId: settings.r2AccessKeyId || "",
        secretAccessKey: settings.r2SecretAccessKey ? maskSecret(decrypt(settings.r2SecretAccessKey)) : "",
        bucketName: settings.r2BucketName || "",
        publicUrl: settings.r2PublicUrl || "",
        hasSecret: !!settings.r2SecretAccessKey,
      }
    }

    return { status: 200, data: { settings: response } }
  }
})

export const GET = getStorageSettings

const createStorageSettings = createApiRoute({
  method: 'POST',
  path: '/api/admin/storage-settings',
  summary: 'Create or update storage settings',
  description: 'Create or update storage settings for Cloudinary or R2 providers',
  tags: ['Admin'],
  security: 'adminAuth',
  request: {
    body: storageSettingsUpdateSchema,
  },
  responses: {
    200: storageSettingsCreateResponseSchema,
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async ({ body }) => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return { status: 403, data: { error: "Forbidden" } }
    }

    const { provider, cloudinary, r2 } = body!

    if (!provider || !["cloudinary", "r2"].includes(provider)) {
      return { status: 400, data: { error: "Invalid provider" } }
    }

    await connectDB()

    // Get existing settings to preserve secrets if not provided
    const existingSettings = await StorageSettings.findOne({ isActive: true })

    // Validate required fields based on provider
    if (provider === "cloudinary") {
      if (!cloudinary?.cloudName || !cloudinary?.apiKey) {
        return { 
          status: 400, 
          data: { error: "Missing required Cloudinary credentials (Cloud Name and API Key)" }
        }
      }
      
      // Check if secret is required (new setup or secret not already saved)
      if (!cloudinary.apiSecret && (!existingSettings || !existingSettings.cloudinaryApiSecret)) {
        return { 
          status: 400, 
          data: { error: "API Secret is required for initial Cloudinary setup" }
        }
      }
    } else if (provider === "r2") {
      if (!r2?.accountId || !r2?.accessKeyId || !r2?.bucketName) {
        return { 
          status: 400, 
          data: { error: "Missing required R2 credentials (Account ID, Access Key ID, and Bucket Name)" }
        }
      }
      
      // Check if secret is required (new setup or secret not already saved)
      if (!r2.secretAccessKey && (!existingSettings || !existingSettings.r2SecretAccessKey)) {
        return { 
          status: 400, 
          data: { error: "Secret Access Key is required for initial R2 setup" }
        }
      }
    }

    // Deactivate any existing active settings
    await StorageSettings.updateMany({ isActive: true }, { $set: { isActive: false } })

    // Create new settings
    const settingsData: any = {
      provider,
      isActive: true,
      updatedBy: auth.sub, // auth.sub is the userId
    }

    if (provider === "cloudinary") {
      settingsData.cloudinaryCloudName = cloudinary!.cloudName
      settingsData.cloudinaryApiKey = cloudinary!.apiKey
      
      // Use new secret if provided, otherwise keep existing
      if (cloudinary!.apiSecret) {
        settingsData.cloudinaryApiSecret = encrypt(cloudinary!.apiSecret)
      } else if (existingSettings?.cloudinaryApiSecret) {
        settingsData.cloudinaryApiSecret = existingSettings.cloudinaryApiSecret
      }
      
      // Preserve R2 settings if they exist
      if (existingSettings?.r2AccountId) {
        settingsData.r2AccountId = existingSettings.r2AccountId
        settingsData.r2AccessKeyId = existingSettings.r2AccessKeyId
        settingsData.r2SecretAccessKey = existingSettings.r2SecretAccessKey
        settingsData.r2BucketName = existingSettings.r2BucketName
        settingsData.r2PublicUrl = existingSettings.r2PublicUrl
      }
    } else if (provider === "r2") {
      settingsData.r2AccountId = r2!.accountId
      settingsData.r2AccessKeyId = r2!.accessKeyId
      settingsData.r2BucketName = r2!.bucketName
      settingsData.r2PublicUrl = r2!.publicUrl || ""
      
      // Use new secret if provided, otherwise keep existing
      if (r2!.secretAccessKey) {
        settingsData.r2SecretAccessKey = encrypt(r2!.secretAccessKey)
      } else if (existingSettings?.r2SecretAccessKey) {
        settingsData.r2SecretAccessKey = existingSettings.r2SecretAccessKey
      }
      
      // Preserve Cloudinary settings if they exist
      if (existingSettings?.cloudinaryCloudName) {
        settingsData.cloudinaryCloudName = existingSettings.cloudinaryCloudName
        settingsData.cloudinaryApiKey = existingSettings.cloudinaryApiKey
        settingsData.cloudinaryApiSecret = existingSettings.cloudinaryApiSecret
      }
    }

    await StorageSettings.create(settingsData)

    return { status: 200, data: { success: true, message: "Storage settings saved successfully" } }
  }
})

export const POST = createStorageSettings

const deleteStorageSettings = createApiRoute({
  method: 'DELETE',
  path: '/api/admin/storage-settings',
  summary: 'Delete storage settings',
  description: 'Delete all active storage settings',
  tags: ['Admin'],
  security: 'adminAuth',
  responses: {
    200: successResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    500: errorResponseSchema,
  },
  handler: async () => {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return { status: 401, data: { error: "Unauthorized" } }
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return { status: 403, data: { error: "Forbidden" } }
    }

    await connectDB()
    await StorageSettings.deleteMany({ isActive: true })

    return { status: 200, data: { success: true, message: "Storage settings deleted" } }
  }
})

export const DELETE = deleteStorageSettings

