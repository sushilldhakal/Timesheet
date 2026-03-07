import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as employeeClockApi from '@/lib/api/employee-clock'

// Query keys
export const employeeClockKeys = {
  all: ['employee-clock'] as const,
  profile: () => [...employeeClockKeys.all, 'profile'] as const,
  timesheet: (params?: { 
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number 
  }) => [...employeeClockKeys.all, 'timesheet', params] as const,
}

// Get current employee profile
export function useEmployeeProfile() {
  return useQuery({
    queryKey: employeeClockKeys.profile(),
    queryFn: employeeClockApi.getEmployeeProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on auth failures
  })
}

// Get employee timesheet
export function useEmployeeTimesheet(params?: {
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: employeeClockKeys.timesheet(params),
    queryFn: () => employeeClockApi.getEmployeeTimesheet(params),
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Employee login with PIN
export function useEmployeeLogin() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeeClockApi.employeeLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeClockKeys.profile() })
    },
  })
}

// Employee logout
export function useEmployeeLogout() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeeClockApi.employeeLogout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: employeeClockKeys.all })
    },
  })
}

// Clock in/out/break
export function useClockAction() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeeClockApi.clockAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeClockKeys.profile() })
      queryClient.invalidateQueries({ queryKey: employeeClockKeys.timesheet() })
    },
  })
}

// Change password
export function useChangeEmployeePassword() {
  return useMutation({
    mutationFn: employeeClockApi.changeEmployeePassword,
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