'use client';

import { useAuth as useAuthContext } from '@/components/auth/AuthProvider';

export function useAuth() {
  const { user, isLoading, logout, refetch } = useAuthContext();
  return {
    user,
    userRole: user?.role ?? null,
    isHydrated: !isLoading,
    logout,
    refetch,
  };
}
