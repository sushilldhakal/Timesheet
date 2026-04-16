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

  const userRole = user?.role ?? null;
    
  return {
    user,
    userRole,
    isHydrated,
    isLoading,
    logout,
    refetch,
  };
}
