'use client';

import { useAuth as useAuthContext } from '@/components/auth/AuthProvider';

export function useAuth() {
  const { user, isLoading, logout, refetch } = useAuthContext();
  // Ensure role is available (API may omit it for legacy users; infer admin from username)
  const userRole =
    user?.role ?? (user?.username === "admin" ? "admin" : null);
  return {
    user,
    userRole,
    isHydrated: !isLoading,
    logout,
    refetch,
  };
}
