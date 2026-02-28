import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { connectDB } from "@/lib/db"
import { StorageSettings } from "@/lib/db/schemas/storage-settings"
import { encrypt, decrypt, maskSecret } from "@/lib/utils/encryption"

/** GET /api/admin/storage-settings - Get current storage settings */
export async function GET() {
  try {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const settings = await StorageSettings.findOne({ isActive: true }).lean()

    if (!settings) {
      return NextResponse.json({ settings: null })
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

    return NextResponse.json({ settings: response })
  } catch (error) {
    console.error("[GET /api/admin/storage-settings]", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

/** POST /api/admin/storage-settings - Create or update storage settings */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { provider, cloudinary, r2 } = body

    if (!provider || !["cloudinary", "r2"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
    }

    await connectDB()

    // Get existing settings to preserve secrets if not provided
    const existingSettings = await StorageSettings.findOne({ isActive: true })

    // Validate required fields based on provider
    if (provider === "cloudinary") {
      if (!cloudinary?.cloudName || !cloudinary?.apiKey) {
        return NextResponse.json(
          { error: "Missing required Cloudinary credentials (Cloud Name and API Key)" },
          { status: 400 }
        )
      }
      
      // Check if secret is required (new setup or secret not already saved)
      if (!cloudinary.apiSecret && (!existingSettings || !existingSettings.cloudinaryApiSecret)) {
        return NextResponse.json(
          { error: "API Secret is required for initial Cloudinary setup" },
          { status: 400 }
        )
      }
    } else if (provider === "r2") {
      if (!r2?.accountId || !r2?.accessKeyId || !r2?.bucketName) {
        return NextResponse.json(
          { error: "Missing required R2 credentials (Account ID, Access Key ID, and Bucket Name)" },
          { status: 400 }
        )
      }
      
      // Check if secret is required (new setup or secret not already saved)
      if (!r2.secretAccessKey && (!existingSettings || !existingSettings.r2SecretAccessKey)) {
        return NextResponse.json(
          { error: "Secret Access Key is required for initial R2 setup" },
          { status: 400 }
        )
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
      settingsData.cloudinaryCloudName = cloudinary.cloudName
      settingsData.cloudinaryApiKey = cloudinary.apiKey
      
      // Use new secret if provided, otherwise keep existing
      if (cloudinary.apiSecret) {
        settingsData.cloudinaryApiSecret = encrypt(cloudinary.apiSecret)
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
      settingsData.r2AccountId = r2.accountId
      settingsData.r2AccessKeyId = r2.accessKeyId
      settingsData.r2BucketName = r2.bucketName
      settingsData.r2PublicUrl = r2.publicUrl || ""
      
      // Use new secret if provided, otherwise keep existing
      if (r2.secretAccessKey) {
        settingsData.r2SecretAccessKey = encrypt(r2.secretAccessKey)
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

    return NextResponse.json({ success: true, message: "Storage settings saved successfully" })
  } catch (error) {
    console.error("[POST /api/admin/storage-settings]", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}

/** DELETE /api/admin/storage-settings - Delete storage settings */
export async function DELETE() {
  try {
    const auth = await getAuthFromCookie()
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isAdminOrSuperAdmin(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    await StorageSettings.deleteMany({ isActive: true })

    return NextResponse.json({ success: true, message: "Storage settings deleted" })
  } catch (error) {
    console.error("[DELETE /api/admin/storage-settings]", error)
    return NextResponse.json({ error: "Failed to delete settings" }, { status: 500 })
  }
}
