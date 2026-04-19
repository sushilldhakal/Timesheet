import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/availability'

export function useAvailabilityConstraints(employeeId: string) {
  return useQuery({
    queryKey: ['availability', employeeId],
    queryFn: () => api.getEmployeeAvailability(employeeId),
    enabled: !!employeeId,
  })
}

export function useCreateAvailabilityConstraint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: Omit<api.AvailabilityConstraint, '_id' | 'id' | 'employeeId' | 'createdAt' | 'updatedAt'> }) =>
      api.createAvailabilityConstraint(employeeId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['availability', variables.employeeId] })
    },
  })
}

export function useUpdateAvailabilityConstraint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, constraintId, data }: { employeeId: string; constraintId: string; data: Partial<Omit<api.AvailabilityConstraint, '_id' | 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>> }) =>
      api.updateAvailabilityConstraint(employeeId, constraintId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['availability', variables.employeeId] })
    },
  })
}

export function useDeleteAvailabilityConstraint() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, constraintId }: { employeeId: string; constraintId: string }) =>
      api.deleteEmployeeAvailability(employeeId, constraintId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['availability', variables.employeeId] })
    },
  })
}
