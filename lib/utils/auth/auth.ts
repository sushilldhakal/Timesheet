import type { AuthUser } from '@/lib/types/auth';

export function getUserEmail(user: AuthUser | null | undefined): string {
  return user?.username ?? '';
}

export function getUserRole(user: AuthUser | null | undefined): string | null {
  return user?.role ?? null;
}
