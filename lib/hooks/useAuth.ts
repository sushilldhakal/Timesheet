'use client';

import { useEffect, useState } from 'react';
import { useAuth as useAuthContext } from '@/components/auth/AuthProvider';

export function useAuth() {
  const { user, isLoading, logout, refetch } = useAuthContext();
  const [isHydrated, setIsHydrated] = useState(false);

  // Ensure we're hydrated on the client
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Ensure role is available (API may omit it for legacy users; infer admin from username)
  const userRole =
    user?.role ?? (user?.username === "admin" ? "admin" : null);
    
  return {
    user,
    userRole,
    isHydrated,
    isLoading,
    logout,
    refetch,
  };
}
