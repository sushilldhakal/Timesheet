import {
  Home,
  Users,
  CalendarCheck,
  List,
  UserCog,
  Database,
  Flag,
  Settings,
  Award,
  Calendar,
  Cloud,
  Mail,
  Tablet,
  Clock,
  CircleDollarSign,
  CalendarDays,
  UserCircle,
  Briefcase,
  MapPin,
  ClipboardCheck,
} from 'lucide-react';
import type { NavigationItem, FlatNavItem } from '@/lib/types/dashboard';

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
    label: 'Time & Attendance',
    icon: Clock,
    children: [
      {
        href: '/dashboard/scheduling',
        label: 'Scheduling',
        icon: Calendar,
      },
      {
        href: '/dashboard/timesheet',
        label: 'Timesheet',
        icon: CalendarCheck,
      },
      {
        href: '/dashboard/leave',
        label: 'Leave',
        icon: CalendarCheck,
      },
      {
        href: '/dashboard/unavailability',
        label: 'Unavailability',
        icon: List,
      },
    ],
  },
  {
    label: 'Workforce',
    icon: Database,
    children: [
      {
        href: '/dashboard/teams',
        label: 'Teams',
        icon: UserCircle,
      },
      {
        href: '/dashboard/employers',
        label: 'Employers',
        icon: Briefcase,
      },
      {
        href: '/dashboard/locations',
        label: 'Locations',
        icon: MapPin,
      },
    ],
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
    label: 'Payroll',
    icon: CircleDollarSign,
    adminOnly: true,
    children: [
      { href: '/dashboard/awards',               label: 'Awards',               icon: Award,             adminOnly: true },
      { href: '/dashboard/timesheet-approvals',  label: 'Timesheet Approvals',  icon: ClipboardCheck,    adminOnly: true },
      { href: '/dashboard/pay-runs',             label: 'Pay Runs',             icon: CircleDollarSign,  adminOnly: true },
      { href: '/dashboard/public-holidays',      label: 'Public Holidays',      icon: CalendarDays,      adminOnly: true },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    adminOnly: true,
    children: [
      { href: '/dashboard/devices', label: 'Device Management', icon: Tablet, adminOnly: true },
      { href: '/dashboard/setting/image', label: 'Image Storage', icon: Cloud, adminOnly: true },
      { href: '/dashboard/setting/mail', label: 'Mail Settings', icon: Mail, adminOnly: true },
    ],
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
