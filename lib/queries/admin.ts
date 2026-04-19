import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '@/lib/api/admin'

// Query keys
export const adminKeys = {
  activityLogs: (params?: Parameters<typeof adminApi.getActivityLogs>[0]) => 
    ['admin', 'activity-logs', params] as const,
  storageStats: ['admin', 'storage-stats'] as const,
  storageSettings: ['admin', 'storage-settings'] as const,
  mailSettings: ['admin', 'mail-settings'] as const,
  eventHealth: ['admin', 'event-health'] as const,
  apiKeys: ['admin', 'api-keys'] as const,
}

// Get activity logs
export function useActivityLogs(params?: Parameters<typeof adminApi.getActivityLogs>[0]) {
  return useQuery({
    queryKey: adminKeys.activityLogs(params),
    queryFn: () => adminApi.getActivityLogs(params),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Get storage statistics
export function useStorageStats() {
  return useQuery({
    queryKey: adminKeys.storageStats,
    queryFn: adminApi.getStorageStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get storage settings
export function useStorageSettings() {
  return useQuery({
    queryKey: adminKeys.storageSettings,
    queryFn: adminApi.getStorageSettings,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Update storage settings
export function useUpdateStorageSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: adminApi.updateStorageSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.storageSettings })
    },
  })
}

// Get mail settings
export function useMailSettings() {
  return useQuery({
    queryKey: adminKeys.mailSettings,
    queryFn: adminApi.getMailSettings,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Update mail settings
export function useUpdateMailSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: adminApi.updateMailSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.mailSettings })
    },
  })
}

// Test mail settings
export function useTestMailSettings() {
  return useMutation({
    mutationFn: adminApi.testMailSettings,
  })
}

// Run cleanup
export function useRunCleanup() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: adminApi.runCleanup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.storageStats })
    },
  })
}

// Create test data
export function useCreateTestData() {
  return useMutation({
    mutationFn: adminApi.createTestData,
  })
}

// Get event health data
export function useEventHealth() {
  return useQuery({
    queryKey: adminKeys.eventHealth,
    queryFn: adminApi.getEventHealth,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// Trigger event retry sweep
export function useTriggerRetry() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: adminApi.triggerRetry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.eventHealth })
    },
  })
}

// API Keys management
export function useApiKeys() {
  return useQuery({
    queryKey: adminKeys.apiKeys,
    queryFn: () => adminApi.getApiKeys(),
    select: (data) => data.keys ?? [],
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminApi.createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.apiKeys })
    },
  })
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: adminApi.revokeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.apiKeys })
    },
  })
}
