import {
  Home,
  Users,
  CalendarCheck,
  List,
  UserCog,
  FolderTree,
  Flag,
  Settings,
} from 'lucide-react';
import type { NavigationItem, FlatNavItem } from '@/types/dashboard';

export type { NavigationItem, FlatNavItem } from '@/types/dashboard';

/**
 * Single source of truth for Timesheet dashboard navigation.
 * Used by DashboardSidebar and DashboardHeader (command search).
 */
export const baseNavigationItems: NavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
  },
  {
    href: '/dashboard/employees',
    label: 'Staff',
    icon: Users,
  },
  {
    href: '/dashboard/timesheet',
    label: 'Timesheet',
    icon: CalendarCheck,
  },
  {
    href: '/dashboard/category',
    label: 'Categories',
    icon: FolderTree,
  },
  {
    href: '/dashboard/profile',
    label: 'My Profile',
    icon: UserCog,
  },
  {
    label: 'Users',
    icon: UserCog,
    adminOnly: true,
    children: [
      { href: '/dashboard/users', label: 'All Users', icon: List, adminOnly: true },
    ],
  },
  {
    href: '/dashboard/Setting',
    label: 'Settings',
    icon: Settings,
    adminOnly: true,
  },
  {
    href: '/dashboard/flag',
    label: 'Flag',
    icon: Flag,
  },
];

/**
 * Flattens navigation tree and filters by admin. Used for command palette search.
 */
export function getFlatNavigationForSearch(
  items: NavigationItem[],
  isAdminUser: boolean,
  _userId?: string
): FlatNavItem[] {
  const result: FlatNavItem[] = [];

  for (const item of items) {
    if (item.adminOnly && !isAdminUser) continue;

    if (item.href) {
      result.push({
        href: item.href,
        label: item.label,
        icon: item.icon,
        groupLabel: undefined,
      });
    }

    if (item.children) {
      for (const child of item.children) {
        if (child.adminOnly && !isAdminUser) continue;
        if (!child.href) continue;
        result.push({
          href: child.href,
          label: child.label,
          icon: child.icon,
          groupLabel: item.label,
        });
      }
    }
  }

  return result;
}
