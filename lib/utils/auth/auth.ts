import type { AuthUser } from '@/lib/types/auth';

export function getUserEmail(user: AuthUser | null | undefined): string {
  return user?.email ?? '';
}

export function getUserRole(user: AuthUser | null | undefined): string | null {
  return user?.role ?? null;
}
