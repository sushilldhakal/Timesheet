import { createApiRoute } from "@/lib/api/create-api-route"
import { 
  employeeSyncRequestSchema,
  employeeSyncResponseSchema
} from "@/lib/validations/employee-sync"
import { errorResponseSchema } from "@/lib/validations/auth"
import { employeeSyncPhotosService } from "@/lib/services/employee/employee-sync-photos-service"

export const GET = createApiRoute({
  method: 'GET',
  path: '/api/employees/sync-photos',
  summary: 'Sync all employee photos',
  description: 'Sync employee photos from their most recent punch records',
  tags: ['Employees'],
  security: 'adminAuth',
  responses: {
    200: employeeSyncResponseSchema,
    500: errorResponseSchema
  },
  handler: async () => {
    return await employeeSyncPhotosService.syncAll()
  }
});

export const POST = createApiRoute({
  method: 'POST',
  path: '/api/employees/sync-photos',
  summary: 'Sync specific employee photo',
  description: 'Sync photo for a specific employee',
  tags: ['Employees'],
  security: 'adminAuth',
  request: {
    body: employeeSyncRequestSchema
  },
  responses: {
    200: employeeSyncResponseSchema,
    400: errorResponseSchema,
    404: errorResponseSchema,
    500: errorResponseSchema
  },
  handler: async ({ body }) => {
    return await employeeSyncPhotosService.syncOne(body)
  }
});
