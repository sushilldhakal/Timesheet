import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as authApi from '@/lib/api/auth'

// Get current user
export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Logout
export function useLogout() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear()
    },
  })
}

// Unified login
export function useUnifiedLogin() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: authApi.unifiedLogin,
    onSuccess: () => {
      // Invalidate auth queries on successful login
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
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
export function useVerifyResetToken(token: string) {
  return useQuery({
    queryKey: ['auth', 'verify-reset-token', token],
    queryFn: () => authApi.verifyResetToken(token),
    enabled: !!token,
    retry: false,
  })
}

// Verify setup token
export function useVerifySetupToken(token: string) {
  return useQuery({
    queryKey: ['auth', 'verify-setup-token', token],
    queryFn: () => authApi.verifySetupToken(token),
    enabled: !!token,
    retry: false,
  })
}