import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type ApiKeyRecord = {
  _id: string
  name: string
  keyPrefix: string
  scopes: string[]
  isActive: boolean
  createdAt: string
  lastUsedAt?: string
  expiresAt?: string
  rateLimit: number
}

export function useApiKeys() {
  return useQuery<ApiKeyRecord[]>({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const res = await fetch("/api/admin/api-keys")
      if (!res.ok) throw new Error("Failed to fetch API keys")
      const data = await res.json()
      return data.keys ?? []
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      name: string
      scopes: string[]
      expiresAt?: string
    }): Promise<{ key: string; record: ApiKeyRecord }> => {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to create API key")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
      // Note: success toast is shown by the UI after displaying the key
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create API key")
    },
  })
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (keyId: string) => {
      const res = await fetch(`/api/admin/api-keys/${keyId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to revoke API key")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] })
      toast.success("API key revoked")
    },
    onError: () => {
      toast.error("Failed to revoke API key")
    },
  })
}
