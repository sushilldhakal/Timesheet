import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '@/lib/api/employees'

export function useStaffProfile(id: string) {
  return useQuery({
    queryKey: ['employee', id],
    queryFn: () => api.getEmployee(id),
    enabled: !!id,
  })
}

export function useUpdateStaffProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: api.UpdateEmployeeRequest }) =>
      api.updateEmployee(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employee', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['employees'] })
    },
  })
}
