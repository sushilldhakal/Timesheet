// Re-export from queries (following architecture pattern)
export {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from "@/lib/queries/admin"

// Re-export types from API
export type { ApiKeyRecord } from "@/lib/api/admin"