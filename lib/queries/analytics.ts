import { useQuery, useMutation } from '@tanstack/react-query'
import * as analyticsApi from '@/lib/api/analytics'

// Query keys
export const analyticsKeys = {
  employeeReport: (params?: Parameters<typeof analyticsApi.getEmployeeReport>[0]) => 
    ['analytics', 'employee-report', params] as const,
  noShowsReport: (params?: Parameters<typeof analyticsApi.getNoShowsReport>[0]) => 
    ['analytics', 'no-shows', params] as const,
  punctualityReport: (params?: Parameters<typeof analyticsApi.getPunctualityReport>[0]) => 
    ['analytics', 'punctuality', params] as const,
  varianceReport: (params?: Parameters<typeof analyticsApi.getVarianceReport>[0]) => 
    ['analytics', 'variance', params] as const,
  weeklyReport: (params?: Parameters<typeof analyticsApi.getWeeklyReport>[0]) => 
    ['analytics', 'weekly-report', params] as const,
  labourCost: (params?: Parameters<typeof analyticsApi.getLabourCostAnalytics>[0]) => 
    ['analytics', 'labour-cost', params] as const,
}

// Get employee report
export function useEmployeeReport(params?: Parameters<typeof analyticsApi.getEmployeeReport>[0]) {
  return useQuery({
    queryKey: analyticsKeys.employeeReport(params),
    queryFn: () => analyticsApi.getEmployeeReport(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get no-shows report
export function useNoShowsReport(params?: Parameters<typeof analyticsApi.getNoShowsReport>[0]) {
  return useQuery({
    queryKey: analyticsKeys.noShowsReport(params),
    queryFn: () => analyticsApi.getNoShowsReport(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get punctuality report
export function usePunctualityReport(params?: Parameters<typeof analyticsApi.getPunctualityReport>[0]) {
  return useQuery({
    queryKey: analyticsKeys.punctualityReport(params),
    queryFn: () => analyticsApi.getPunctualityReport(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get variance report
export function useVarianceReport(params?: Parameters<typeof analyticsApi.getVarianceReport>[0]) {
  return useQuery({
    queryKey: analyticsKeys.varianceReport(params),
    queryFn: () => analyticsApi.getVarianceReport(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get weekly report
export function useWeeklyReport(params?: Parameters<typeof analyticsApi.getWeeklyReport>[0]) {
  return useQuery({
    queryKey: analyticsKeys.weeklyReport(params),
    queryFn: () => analyticsApi.getWeeklyReport(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get labour cost analytics
export function useLabourCostAnalytics(params?: Parameters<typeof analyticsApi.getLabourCostAnalytics>[0]) {
  return useQuery({
    queryKey: analyticsKeys.labourCost(params),
    queryFn: () => analyticsApi.getLabourCostAnalytics(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Generate labour cost analysis
export function useGenerateLabourCostAnalysis() {
  return useMutation({
    mutationFn: analyticsApi.generateLabourCostAnalysis,
  })
}
