import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as dashboardApi from '@/lib/api/dashboard'
import * as employeesApi from '@/lib/api/employees'

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  hoursSummary: (params?: { startDate?: string; endDate?: string; locationId?: string }) => 
    [...dashboardKeys.all, 'hours-summary', params] as const,
  inactiveEmployees: (params?: { days?: number; locationId?: string }) => 
    [...dashboardKeys.all, 'inactive-employees', params] as const,
  locationStats: (params?: { startDate?: string; endDate?: string }) => 
    [...dashboardKeys.all, 'location-stats', params] as const,
  roleStats: (params?: { startDate?: string; endDate?: string }) => 
    [...dashboardKeys.all, 'role-stats', params] as const,
  userStats: () => [...dashboardKeys.all, 'user-stats'] as const,
  notificationCount: () => [...dashboardKeys.all, 'notification-count'] as const,
}

// Get dashboard stats
export function useDashboardStats(params?: {
  timelineDate?: string
}) {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => dashboardApi.getDashboardStats(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get hours summary
export function useHoursSummary(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
}) {
  return useQuery({
    queryKey: dashboardKeys.hoursSummary(params),
    queryFn: () => dashboardApi.getHoursSummary(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Get inactive employees
export function useInactiveEmployees(params?: {
  days?: number
  locationId?: string
}) {
  return useQuery({
    queryKey: dashboardKeys.inactiveEmployees(params),
    queryFn: () => dashboardApi.getInactiveEmployees(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get location stats
export function useLocationStats(params?: {
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: dashboardKeys.locationStats(params),
    queryFn: () => dashboardApi.getLocationStats(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get role stats
export function useRoleStats(params?: {
  startDate?: string
  endDate?: string
}) {
  return useQuery({
    queryKey: dashboardKeys.roleStats(params),
    queryFn: () => dashboardApi.getRoleStats(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get user stats
export function useUserStats() {
  return useQuery({
    queryKey: dashboardKeys.userStats(),
    queryFn: dashboardApi.getUserStats,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get notification count
export function useNotificationCount() {
  return useQuery({
    queryKey: dashboardKeys.notificationCount(),
    queryFn: dashboardApi.getNotificationCount,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  })
}

// Delete employee (used in dashboard inactive employees)
export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => employeesApi.deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.inactiveEmployees() })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}