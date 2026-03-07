import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as devicesApi from '@/lib/api/devices'
import type { UpdateDeviceRequest } from '@/lib/types/devices'

// Query keys
export const deviceKeys = {
  all: ['devices'] as const,
  check: () => [...deviceKeys.all, 'check'] as const,
  list: (params?: { search?: string; locationName?: string; isActive?: boolean }) => 
    [...deviceKeys.all, 'list', params] as const,
  detail: (id: string) => [...deviceKeys.all, 'detail', id] as const,
  managed: () => [...deviceKeys.all, 'managed'] as const,
  publicLocations: () => ['public-locations'] as const,
}

// Check if device is authorized
export function useDeviceCheck() {
  return useQuery({
    queryKey: deviceKeys.check(),
    queryFn: devicesApi.checkDevice,
    staleTime: 30 * 1000, // 30 seconds
    retry: false, // Don't retry on auth failures
  })
}

// Get all devices (admin only)
export function useDevices(params?: {
  search?: string
  locationName?: string
  isActive?: boolean
}) {
  return useQuery({
    queryKey: deviceKeys.list(params),
    queryFn: () => devicesApi.getDevices(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Get a specific device (admin only)
export function useDevice(id: string) {
  return useQuery({
    queryKey: deviceKeys.detail(id),
    queryFn: () => devicesApi.getDevice(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Activate/register a device
export function useActivateDevice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: devicesApi.activateDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.check() })
      queryClient.invalidateQueries({ queryKey: deviceKeys.all })
    },
  })
}

// Update a device (admin only)
export function useUpdateDevice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeviceRequest }) =>
      devicesApi.updateDevice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: deviceKeys.all })
    },
  })
}

// Delete a device (admin only)
export function useDeleteDevice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: devicesApi.deleteDevice,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: deviceKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: deviceKeys.all })
    },
  })
}

// Get managed devices (admin only)
export function useManagedDevices() {
  return useQuery({
    queryKey: deviceKeys.managed(),
    queryFn: devicesApi.getManagedDevices,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Create managed device (admin only)
export function useCreateManagedDevice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: devicesApi.createManagedDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.managed() })
    },
  })
}

// Update managed device status (admin only)
export function useUpdateManagedDevice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: devicesApi.updateManagedDevice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceKeys.managed() })
    },
  })
}

// Register device with authentication
export function useRegisterDeviceWithAuth() {
  return useMutation({
    mutationFn: devicesApi.registerDeviceWithAuth,
  })
}

// Get public locations (no auth required)
export function usePublicLocations() {
  return useQuery({
    queryKey: deviceKeys.publicLocations(),
    queryFn: devicesApi.getPublicLocations,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  })
}