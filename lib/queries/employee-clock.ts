import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as employeeClockApi from '@/lib/api/employee-clock'

// Query keys
export const employeeClockKeys = {
  profile: ['employee', 'profile'] as const,
  timesheet: (params?: Parameters<typeof employeeClockApi.getEmployeeTimesheet>[0]) => 
    ['employee', 'timesheet', params] as const,
}

// Get employee profile
export function useEmployeeProfile() {
  return useQuery({
    queryKey: employeeClockKeys.profile,
    queryFn: employeeClockApi.getEmployeeProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Employee login
export function useEmployeeLogin() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeeClockApi.employeeLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeClockKeys.profile })
    },
  })
}

// Employee logout
export function useEmployeeLogout() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeeClockApi.employeeLogout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: employeeClockKeys.profile })
    },
  })
}

// Clock action (in/out/break)
export function useClockAction() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeeClockApi.clockAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeClockKeys.profile })
      queryClient.invalidateQueries({ queryKey: employeeClockKeys.timesheet() })
    },
  })
}

// Change employee password
export function useChangeEmployeePassword() {
  return useMutation({
    mutationFn: employeeClockApi.changeEmployeePassword,
  })
}

// Get employee timesheet
export function useEmployeeTimesheet(params?: Parameters<typeof employeeClockApi.getEmployeeTimesheet>[0]) {
  return useQuery({
    queryKey: employeeClockKeys.timesheet(params),
    queryFn: () => employeeClockApi.getEmployeeTimesheet(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Upload file
export function useUploadFile() {
  return useMutation({
    mutationFn: employeeClockApi.uploadFile,
  })
}

// Create offline session
export function useCreateOfflineSession() {
  return useMutation({
    mutationFn: employeeClockApi.createOfflineSession,
  })
}

// Sync offline clock events
export function useSyncOfflineClockEvents() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeeClockApi.syncOfflineClockEvents,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeClockKeys.profile })
      queryClient.invalidateQueries({ queryKey: employeeClockKeys.timesheet() })
    },
  })
}
