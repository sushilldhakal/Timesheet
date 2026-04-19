import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as authApi from '@/lib/api/auth'

// Query keys
export const authKeys = {
  me: ['auth', 'me'] as const,
  verifyResetToken: (token: string) => ['auth', 'verify-reset-token', token] as const,
  verifySetupToken: (token: string) => ['auth', 'verify-setup-token', token] as const,
}

// Get current user
export function useMe() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.getMe,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })
}

// Unified login
export function useUnifiedLogin() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: authApi.unifiedLogin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

// Logout
export function useLogout() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authKeys.me })
      queryClient.clear()
    },
  })
}

// Change password
export function useChangePassword() {
  return useMutation({
    mutationFn: authApi.changePassword,
  })
}

// Forgot password
export function useForgotPassword() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
  })
}

// Reset password
export function useResetPassword() {
  return useMutation({
    mutationFn: authApi.resetPassword,
  })
}

// Setup password
export function useSetupPassword() {
  return useMutation({
    mutationFn: authApi.setupPassword,
  })
}

// Verify reset token
export function useVerifyResetToken(token: string, enabled: boolean = true) {
  return useQuery({
    queryKey: authKeys.verifyResetToken(token),
    queryFn: () => authApi.verifyResetToken(token),
    enabled: enabled && !!token,
    retry: false,
    staleTime: 0, // Don't cache token verification
  })
}

// Verify setup token
export function useVerifySetupToken(token: string, enabled: boolean = true) {
  return useQuery({
    queryKey: authKeys.verifySetupToken(token),
    queryFn: () => authApi.verifySetupToken(token),
    enabled: enabled && !!token,
    retry: false,
    staleTime: 0, // Don't cache token verification
  })
}
