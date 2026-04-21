import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as employeesApi from '@/lib/api/employees'

// Query keys
export const employeeKeys = {
  all: ['employees'] as const,
  detail: (id: string) => [...employeeKeys.all, 'detail', id] as const,
  timesheet: (id: string, params?: URLSearchParams) => [...employeeKeys.all, id, 'timesheet', params?.toString()] as const,
  awardHistory: (id: string) => [...employeeKeys.all, id, 'award-history'] as const,
  teams: (id: string, params?: { locationId?: string; date?: string; includeInactive?: boolean }) => 
    [...employeeKeys.all, id, 'teams', params] as const,
}

// Get all employees
export function useEmployees(limit?: number) {
  return useQuery({
    queryKey: limit ? [...employeeKeys.all, 'limit', limit] : employeeKeys.all,
    queryFn: () => employeesApi.getEmployees(limit ? { limit } : undefined),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get employee by ID
export function useEmployee(id: string) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeesApi.getEmployee(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Create employee
export function useCreateEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeesApi.createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}

// Update employee
export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: employeesApi.UpdateEmployeeRequest }) =>
      employeesApi.updateEmployee(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) })
    },
  })
}

// Delete employee
export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: employeesApi.deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}

// Generate PIN
export function useGeneratePin() {
  return useMutation({
    mutationFn: employeesApi.generatePin,
  })
}

// Check PIN availability
export function useCheckPin() {
  return useMutation({
    mutationFn: employeesApi.checkPin,
  })
}

// Get employee timesheet
export function useEmployeeTimesheet(id: string, params?: URLSearchParams) {
  return useQuery({
    queryKey: employeeKeys.timesheet(id, params),
    queryFn: () => employeesApi.getEmployeeTimesheet(id, params),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Update employee timesheet
export function useUpdateEmployeeTimesheet() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: employeesApi.UpdateTimesheetRequest }) =>
      employeesApi.updateEmployeeTimesheet(employeeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [...employeeKeys.all, variables.employeeId, 'timesheet'] })
    },
  })
}

// Get employee award history
export function useEmployeeAwardHistory(id: string) {
  return useQuery({
    queryKey: employeeKeys.awardHistory(id),
    queryFn: () => employeesApi.getEmployeeAwardHistory(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Award employee
export function useAwardEmployee() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: employeesApi.AwardEmployeeRequest }) =>
      employeesApi.awardEmployee(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.awardHistory(variables.id) })
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.id) })
    },
  })
}

// Create employee team assignment
export function useCreateEmployeeTeam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: employeesApi.CreateEmployeeTeamRequest }) =>
      employeesApi.createEmployeeTeam(employeeId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.employeeId) })
      queryClient.invalidateQueries({ queryKey: [...employeeKeys.all, variables.employeeId, 'teams'] })
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}

// Get employee team assignments
export function useEmployeeTeams(
  employeeId: string,
  params?: { locationId?: string; date?: string; includeInactive?: boolean }
) {
  return useQuery({
    queryKey: employeeKeys.teams(employeeId, params),
    queryFn: () => employeesApi.getEmployeeTeams(employeeId, params),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Delete employee team assignment
export function useDeleteEmployeeTeam() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ employeeId, assignmentId }: { employeeId: string; assignmentId: string }) =>
      employeesApi.deleteEmployeeTeam(employeeId, assignmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.detail(variables.employeeId) })
      queryClient.invalidateQueries({ queryKey: [...employeeKeys.all, variables.employeeId, 'teams'] })
      queryClient.invalidateQueries({ queryKey: employeeKeys.all })
    },
  })
}

// Get employee availability
export function useEmployeeAvailability(employeeId: string, params?: { date?: string; locationId?: string }) {
  return useQuery({
    queryKey: [...employeeKeys.all, employeeId, 'availability', params],
    queryFn: () => employeesApi.getEmployeeAvailability(employeeId, params),
    enabled: !!employeeId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// ─── Employee Payroll & Compliance ───────────────────────

export function useEmployeeTaxInfo(employeeId: string) {
  return useQuery({
    queryKey: [...employeeKeys.all, employeeId, 'tax-info'],
    queryFn: () => employeesApi.getEmployeeTaxInfo(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useEmployeeBankDetails(employeeId: string) {
  return useQuery({
    queryKey: [...employeeKeys.all, employeeId, 'bank-details'],
    queryFn: () => employeesApi.getEmployeeBankDetails(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function useEmployeeContracts(employeeId: string) {
  return useQuery({
    queryKey: [...employeeKeys.all, employeeId, 'contracts'],
    queryFn: () => employeesApi.getEmployeeContracts(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useEmployeeQualifications(employeeId: string) {
  return useQuery({
    queryKey: [...employeeKeys.all, employeeId, 'qualifications'],
    queryFn: () => employeesApi.getEmployeeQualifications(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useEmployeeCompliance(employeeId: string) {
  return useQuery({
    queryKey: [...employeeKeys.all, employeeId, 'compliance'],
    queryFn: () => employeesApi.getEmployeeCompliance(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  })
}
