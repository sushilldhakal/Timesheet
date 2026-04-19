import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as employersApi from '@/lib/api/employers'
import type { UpdateEmployerRequest } from '@/lib/types'

export const employerKeys = {
  all: ['employers'] as const,
  detail: (id: string) => [...employerKeys.all, 'detail', id] as const,
}

type UseEmployersOpts = { listMode?: boolean }

export function useEmployers(opts?: UseEmployersOpts) {
  const listMode = opts?.listMode === true
  return useQuery({
    queryKey: employerKeys.all,
    queryFn: () => employersApi.getAll(),
    staleTime: listMode ? 0 : 5 * 60 * 1000,
    refetchOnMount: listMode ? 'always' : true,
  })
}

export function useEmployer(id: string) {
  return useQuery({
    queryKey: employerKeys.detail(id),
    queryFn: () => employersApi.getOne(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateEmployer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: employersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.all })
    },
  })
}

export function useUpdateEmployer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEmployerRequest }) =>
      employersApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: employerKeys.all })
      queryClient.invalidateQueries({ queryKey: employerKeys.detail(variables.id) })
    },
  })
}

export function useDeleteEmployer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: employersApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerKeys.all })
    },
  })
}

export const employerSettingsKeys = {
  settings: ['employer-settings'] as const,
}

export function useEmployerSettings(enabled = true) {
  return useQuery({
    queryKey: employerSettingsKeys.settings,
    queryFn: () => employersApi.getEmployerSettings(),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateEmployerSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: employersApi.updateEmployerSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employerSettingsKeys.settings })
    },
  })
}

