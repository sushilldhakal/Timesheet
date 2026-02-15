import type { LucideIcon } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface NavigationItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  children?: NavigationItem[];
}

export interface FlatNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  groupLabel?: string;
}

export interface DashboardLayoutClientProps {
  children: React.ReactNode;
}

export interface DashboardSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  mobileMenuOpen?: boolean;
}

export interface DashboardHeaderProps {
  isCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onLogout?: () => void;
}
