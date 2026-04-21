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
  Bell,
  Key,
  BarChart3,
  TrendingUp,
  Sparkles,
  Activity,
  ShieldCheck,
  Server,
  FileText,
  Building2,
  ClipboardList,
} from 'lucide-react';
import type { NavigationItem, FlatNavItem } from '@/lib/types/dashboard';

/**
 * Single source of truth for Timesheet dashboard navigation.
 * Used by DashboardSidebar and DashboardHeader (command search).
 * 
 * Navigation items are marked with visibility flags:
 * - adminOnly: visible to admin role only (not super_admin in platform mode)
 * - managerOnly: visible to manager, admin, and super_admin in org context
 * - superAdminOnly: visible only to super_admin
 * - orgContextOnly: hidden from super_admin when in platform mode (viewing all orgs)
 */
export const baseNavigationItems: NavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: Home,
  },
  // Org-admin navigation (hidden from super_admin in platform mode)
  {
    href: '/dashboard/employees',
    label: 'Staff',
    icon: Users,
    orgContextOnly: true,
  },
  {
    label: 'Time & Attendance',
    icon: Clock,
    orgContextOnly: true,
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
    orgContextOnly: true,
    children: [
      {
        href: '/dashboard/teams',
        label: 'Teams',
        icon: UserCircle,
      },
      // Employers is shown only when org has enableExternalHire turned on (handled in sidebar via org settings)
      // Locations is admin-only — managers are location managers but cannot create/delete locations
      {
        href: '/dashboard/locations',
        label: 'Locations',
        icon: MapPin,
        adminOnly: true,
      },
    ],
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    managerOnly: true,
    orgContextOnly: true,
    children: [
      { href: '/dashboard/analytics/labour-cost', label: 'Labour Cost', icon: TrendingUp, managerOnly: true },
      { href: '/dashboard/demand-forecast', label: 'Demand Forecast', icon: Sparkles, managerOnly: true },
    ],
  },
  {
    label: 'Users',
    icon: UserCog,
    managerOnly: true,
    orgContextOnly: true,
    children: [
      { href: '/dashboard/users', label: 'All Users', icon: List, managerOnly: true },
    ],
  },
  {
    label: 'Payroll',
    icon: CircleDollarSign,
    adminOnly: true,
    orgContextOnly: true,
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
    managerOnly: true,
    orgContextOnly: true,
    children: [
      { href: '/dashboard/devices', label: 'Device Management', icon: Tablet, managerOnly: true },
      { href: '/dashboard/setting/image', label: 'Image Storage', icon: Cloud, adminOnly: true },
      { href: '/dashboard/setting/mail', label: 'Mail Settings', icon: Mail, adminOnly: true },
      { href: '/dashboard/setting/api-keys', label: 'API Keys', icon: Key, adminOnly: true },
      { href: '/dashboard/setting/compliance', label: 'Compliance Config', icon: ShieldCheck, adminOnly: true },
      // Employers shown conditionally when org has enableExternalHire — injected by sidebar
    ],
  },
  {
    href: '/dashboard/flag',
    label: 'Flag',
    icon: Flag,
    orgContextOnly: true,
  },
  // Super admin platform navigation (always visible to super_admin)
  {
    label: 'Platform',
    icon: Server,
    superAdminOnly: true,
    children: [
      { href: '/dashboard/superadmin/org-usage', label: 'Organizations', icon: Building2, superAdminOnly: true },
      { href: '/dashboard/superadmin/signup-requests', label: 'Signup Requests', icon: ClipboardList, superAdminOnly: true },
      { href: '/dashboard/superadmin/users', label: 'Users', icon: Users, superAdminOnly: true },
    ],
  },
  {
    label: 'Usage & Control',
    icon: BarChart3,
    superAdminOnly: true,
    children: [
      { href: '/dashboard/superadmin/quota-requests', label: 'Quota Requests', icon: FileText, superAdminOnly: true },
      { href: '/dashboard/superadmin/analytics', label: 'Analytics', icon: TrendingUp, superAdminOnly: true },
      { href: '/dashboard/superadmin/alerts', label: 'Alerts', icon: Bell, superAdminOnly: true },
    ],
  },
  {
    label: 'System',
    icon: ShieldCheck,
    superAdminOnly: true,
    children: [
      { href: '/dashboard/superadmin/system-settings', label: 'System Settings', icon: Settings, superAdminOnly: true },
      { href: '/dashboard/admin/event-health', label: 'Event Bus Health', icon: Activity, superAdminOnly: true },
      { href: '/dashboard/superadmin/audit-logs', label: 'Audit Logs', icon: FileText, superAdminOnly: true },
    ],
  },
];

/**
 * Flattens navigation tree and filters by role. Used for command palette search.
 */
export function getFlatNavigationForSearch(
  items: NavigationItem[],
  isAdminUser: boolean,
  _userId?: string,
  isManagerUser?: boolean,
  isSuperAdminUser?: boolean,
  tenantId?: string
): FlatNavItem[] {
  const result: FlatNavItem[] = [];
  const canSeeManagerItems = isAdminUser || (isManagerUser ?? false);
  const isSuperAdminPlatformMode = isSuperAdminUser && (tenantId === '__super_admin__' || !tenantId);

  for (const item of items) {
    if (item.superAdminOnly && !isSuperAdminUser) continue;
    if (item.adminOnly && !isAdminUser) continue;
    if (item.managerOnly && !canSeeManagerItems) continue;
    // Hide org-context items from super admin in platform mode
    if (item.orgContextOnly && isSuperAdminPlatformMode) continue;

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
        if (child.superAdminOnly && !isSuperAdminUser) continue;
        if (child.adminOnly && !isAdminUser) continue;
        if (child.managerOnly && !canSeeManagerItems) continue;
        // Hide org-context items from super admin in platform mode
        if (child.orgContextOnly && isSuperAdminPlatformMode) continue;
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
