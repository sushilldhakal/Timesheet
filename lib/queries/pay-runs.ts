import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as payRunsApi from '@/lib/api/pay-runs'
import type { CreatePayRunRequest } from '@/lib/api/pay-runs'

export const payRunKeys = {
  all: (tenantId: string) => ['pay-runs', tenantId] as const,
  detail: (payRunId: string) => ['pay-runs', 'detail', payRunId] as const,
  export: (payRunId: string) => ['pay-runs', 'export', payRunId] as const,
  status: (payRunId: string) => ['pay-runs', 'status', payRunId] as const,
}

export function usePayRuns(tenantId: string) {
  return useQuery({
    queryKey: payRunKeys.all(tenantId),
    queryFn: () => payRunsApi.getPayRuns(tenantId),
    enabled: !!tenantId,
    staleTime: 30 * 1000, // 30 seconds — pay run status changes frequently
  })
}

export function usePayRunExport(payRunId: string) {
  return useQuery({
    queryKey: payRunKeys.export(payRunId),
    queryFn: () => payRunsApi.getPayRunExport(payRunId),
    enabled: !!payRunId,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePayRunJobStatus(payRunId: string, enabled: boolean) {
  return useQuery({
    queryKey: payRunKeys.status(payRunId),
    queryFn: () => payRunsApi.getPayRunJobStatus(payRunId),
    enabled: enabled && !!payRunId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 2000 // poll every 2 seconds while pending
    },
    staleTime: 0,
  })
}

export function useCreatePayRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePayRunRequest) => payRunsApi.createPayRun(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: payRunKeys.all(variables.tenantId) })
    },
  })
}

export function useCalculatePayRun() {
  return useMutation({
    mutationFn: (payRunId: string) => payRunsApi.calculatePayRun(payRunId),
  })
}

export function useApprovePayRun(tenantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payRunId: string) => payRunsApi.approvePayRun(payRunId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payRunKeys.all(tenantId) })
    },
  })
}
