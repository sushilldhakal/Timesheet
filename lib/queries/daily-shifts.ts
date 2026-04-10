import { useQuery } from '@tanstack/react-query'
import * as timesheetsApi from '@/lib/api/daily-shifts'

// Query keys
export const timesheetKeys = {
  all: ['timesheets'] as const,
  filtered: (filters: timesheetsApi.TimesheetFilters) => [...timesheetKeys.all, 'filtered', filters] as const,
}

// Get timesheets with filters
export function useTimesheets(filters: timesheetsApi.TimesheetFilters) {
  return useQuery({
    queryKey: timesheetKeys.filtered(filters),
    queryFn: () => timesheetsApi.getTimesheets(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}