import { NextRequest, NextResponse } from "next/server"
import { getAuthFromCookie } from "@/lib/auth/auth-helpers"
import { isAdminOrSuperAdmin } from "@/lib/config/roles"
import { createApiRoute } from "@/lib/api/create-api-route"
import {
  storageSettingsUpdateSchema,
  storageSettingsResponseSchema,
  storageSettingsCreateResponseSchema,
} from "@/lib/validations/admin"
import { errorResponseSchema, successResponseSchema } from "@/lib/validations/auth"
import { storageSettingsService } from "@/lib/services/admin/storage-settings-service"

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
    return { status: 200, data: await storageSettingsService.getMasked() }
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
    return await storageSettingsService.save(auth, body)
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
    return { status: 200, data: await storageSettingsService.deleteActive() }
  }
})

export const DELETE = deleteStorageSettings

