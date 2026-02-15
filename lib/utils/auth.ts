import type { AuthUser } from '@/components/auth/AuthProvider';

export function getUserEmail(user: AuthUser | null | undefined): string {
  return user?.username ?? '';
}

export function getUserRole(user: AuthUser | null | undefined): string | null {
  return user?.role ?? null;
}
