import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as timesheetsApi from '@/lib/api/daily-shifts'

// Query keys
export const timesheetKeys = {
  all: ['timesheets'] as const,
  filtered: (filters: timesheetsApi.TimesheetFilters) => [...timesheetKeys.all, 'filtered', filters] as const,
  approval: (params?: Parameters<typeof timesheetsApi.getShiftsForApproval>[0]) => 
    [...timesheetKeys.all, 'approval', params] as const,
}

// Get timesheets with filters
export function useTimesheets(filters: timesheetsApi.TimesheetFilters) {
  return useQuery({
    queryKey: timesheetKeys.filtered(filters),
    queryFn: () => timesheetsApi.getTimesheets(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Update a daily shift
export function useUpdateDailyShift() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<timesheetsApi.TimesheetRow> }) =>
      timesheetsApi.updateDailyShift(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all })
    },
  })
}

// Bulk approve shifts
export function useBulkApproveShifts() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: timesheetsApi.bulkApproveShifts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all })
    },
  })
}

// Bulk reject shifts
export function useBulkRejectShifts() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason: string }) =>
      timesheetsApi.bulkRejectShifts(ids, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timesheetKeys.all })
    },
  })
}

// Get shifts for approval
export function useShiftsForApproval(params?: Parameters<typeof timesheetsApi.getShiftsForApproval>[0]) {
  return useQuery({
    queryKey: timesheetKeys.approval(params),
    queryFn: () => timesheetsApi.getShiftsForApproval(params),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}