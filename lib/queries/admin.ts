import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as adminApi from '@/lib/api/admin'

// Query keys
export const adminKeys = {
  all: ['admin'] as const,
  activityLogs: (params?: { 
    userId?: string
    action?: string
    resource?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number 
  }) => [...adminKeys.all, 'activity-logs', params] as const,
  storageStats: () => [...adminKeys.all, 'storage-stats'] as const,
  storageSettings: () => [...adminKeys.all, 'storage-settings'] as const,
  mailSettings: () => [...adminKeys.all, 'mail-settings'] as const,
}

// Get activity logs
export function useActivityLogs(params?: {
  userId?: string
  action?: string
  resource?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: adminKeys.activityLogs(params),
    queryFn: () => adminApi.getActivityLogs(params),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Get storage statistics
export function useStorageStats() {
  return useQuery({
    queryKey: adminKeys.storageStats(),
    queryFn: adminApi.getStorageStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get storage settings
export function useStorageSettings() {
  return useQuery({
    queryKey: adminKeys.storageSettings(),
    queryFn: adminApi.getStorageSettings,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get mail settings
export function useMailSettings() {
  return useQuery({
    queryKey: adminKeys.mailSettings(),
    queryFn: adminApi.getMailSettings,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Update storage settings
export function useUpdateStorageSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: adminApi.updateStorageSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.storageSettings() })
    },
  })
}

// Update mail settings
export function useUpdateMailSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: adminApi.updateMailSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.mailSettings() })
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
      queryClient.invalidateQueries({ queryKey: adminKeys.storageStats() })
    },
  })
}

// Create test data
export function useCreateTestData() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: adminApi.createTestData,
    onSuccess: () => {
      // Invalidate all data since test data affects everything
      queryClient.invalidateQueries()
    },
  })
}