import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as payrollApi from '@/lib/api/payroll'

// Query keys
export const payrollKeys = {
  mappings: (systemType: payrollApi.PayrollSystemType) => 
    ['payroll', 'mappings', systemType] as const,
  exportPreview: (payRunId: string, systemType: payrollApi.PayrollSystemType) => 
    ['payroll', 'export-preview', payRunId, systemType] as const,
}

// Get payroll mappings
export function usePayrollMappings(payrollSystemType: payrollApi.PayrollSystemType) {
  return useQuery({
    queryKey: payrollKeys.mappings(payrollSystemType),
    queryFn: () => payrollApi.getPayrollMappings(payrollSystemType),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Create payroll mapping
export function useCreatePayrollMapping() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: payrollApi.createPayrollMapping,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: payrollKeys.mappings(data.payrollSystemType) 
      })
    },
  })
}

// Update payroll mapping
export function useUpdatePayrollMapping() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: payrollApi.CreatePayrollMappingRequest }) =>
      payrollApi.updatePayrollMapping(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: payrollKeys.mappings(data.payrollSystemType) 
      })
    },
  })
}

// Delete payroll mapping
export function useDeletePayrollMapping() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: payrollApi.deletePayrollMapping,
    onSuccess: () => {
      // Invalidate all mapping queries since we don't know which system type
      queryClient.invalidateQueries({ queryKey: ['payroll', 'mappings'] })
    },
  })
}

// Get payroll export preview
export function usePayrollExportPreview(
  payRunId: string, 
  payrollSystemType: payrollApi.PayrollSystemType,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: payrollKeys.exportPreview(payRunId, payrollSystemType),
    queryFn: () => payrollApi.getPayrollExportPreview(payRunId, payrollSystemType),
    enabled: enabled && !!payRunId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Export payroll data (returns Blob for download)
export function useExportPayrollData() {
  return useMutation({
    mutationFn: payrollApi.exportPayrollData,
  })
}
