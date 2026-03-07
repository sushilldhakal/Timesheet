import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as settingsApi from '@/lib/api/settings'

// Query keys
export const settingsKeys = {
  mail: ['settings', 'mail'] as const,
  storage: ['settings', 'storage'] as const,
  storageStats: ['settings', 'storage', 'stats'] as const,
  activityLogs: (category: string, page: number) => ['settings', 'activity-logs', category, page] as const,
}

// Mail Settings
export function useMailSettings() {
  return useQuery({
    queryKey: settingsKeys.mail,
    queryFn: settingsApi.getMailSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateMailSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: settingsApi.updateMailSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.mail })
    },
  })
}

export function useTestMailSettings() {
  return useMutation({
    mutationFn: settingsApi.testMailSettings,
  })
}

// Storage Settings
export function useStorageSettings() {
  return useQuery({
    queryKey: settingsKeys.storage,
    queryFn: settingsApi.getStorageSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateStorageSettings() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: settingsApi.updateStorageSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.storage })
      queryClient.invalidateQueries({ queryKey: settingsKeys.storageStats })
    },
  })
}

export function useTestStorageConnection() {
  return useMutation({
    mutationFn: settingsApi.testStorageConnection,
  })
}

// Storage Stats
export function useStorageStats() {
  return useQuery({
    queryKey: settingsKeys.storageStats,
    queryFn: settingsApi.getStorageStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Activity Logs
export function useActivityLogs(category: string, page = 1) {
  return useQuery({
    queryKey: settingsKeys.activityLogs(category, page),
    queryFn: () => settingsApi.getActivityLogs(category, 10, page),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useCreateActivityLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: settingsApi.createActivityLog,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['settings', 'activity-logs', variables.category] 
      })
    },
  })
}

// Cleanup
export function useCleanupCloudinary() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: settingsApi.cleanupCloudinary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.storageStats })
    },
  })
}

export function useCleanupTimesheets() {
  return useMutation({
    mutationFn: settingsApi.cleanupTimesheets,
  })
}