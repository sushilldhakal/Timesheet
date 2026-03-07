import { useQuery } from '@tanstack/react-query'
import * as analyticsApi from '@/lib/api/analytics'

// Query keys
export const analyticsKeys = {
  all: ['analytics'] as const,
  employeeReport: (params?: { 
    startDate?: string
    endDate?: string
    employeeId?: string
    locationId?: string
    roleId?: string 
  }) => [...analyticsKeys.all, 'employee-report', params] as const,
  noShows: (params?: { 
    startDate?: string
    endDate?: string
    locationId?: string
    employeeId?: string 
  }) => [...analyticsKeys.all, 'no-shows', params] as const,
  punctuality: (params?: { 
    startDate?: string
    endDate?: string
    locationId?: string
    employeeId?: string 
  }) => [...analyticsKeys.all, 'punctuality', params] as const,
  variance: (params?: { 
    startDate?: string
    endDate?: string
    locationId?: string
    employeeId?: string
    minVariance?: number 
  }) => [...analyticsKeys.all, 'variance', params] as const,
  weeklyReport: (params?: { 
    startDate?: string
    endDate?: string
    locationId?: string 
  }) => [...analyticsKeys.all, 'weekly-report', params] as const,
}

// Get employee report
export function useEmployeeReport(params?: {
  startDate?: string
  endDate?: string
  employeeId?: string
  locationId?: string
  roleId?: string
}) {
  return useQuery({
    queryKey: analyticsKeys.employeeReport(params),
    queryFn: () => analyticsApi.getEmployeeReport(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get no-shows report
export function useNoShowsReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
  employeeId?: string
}) {
  return useQuery({
    queryKey: analyticsKeys.noShows(params),
    queryFn: () => analyticsApi.getNoShowsReport(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get punctuality report
export function usePunctualityReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
  employeeId?: string
}) {
  return useQuery({
    queryKey: analyticsKeys.punctuality(params),
    queryFn: () => analyticsApi.getPunctualityReport(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get variance report
export function useVarianceReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
  employeeId?: string
  minVariance?: number
}) {
  return useQuery({
    queryKey: analyticsKeys.variance(params),
    queryFn: () => analyticsApi.getVarianceReport(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get weekly report
export function useWeeklyReport(params?: {
  startDate?: string
  endDate?: string
  locationId?: string
}) {
  return useQuery({
    queryKey: analyticsKeys.weeklyReport(params),
    queryFn: () => analyticsApi.getWeeklyReport(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}