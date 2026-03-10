import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface InactiveEmployeeRow {
  id: string
  name: string
  pin: string
  lastPunchDate: string | null
  daysInactive: number
}

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface NavigationItem {
  href?: string
  label: string
  icon: LucideIcon
  adminOnly?: boolean
  children?: NavigationItem[]
}

export interface FlatNavItem {
  href: string
  label: string
  icon: LucideIcon
  groupLabel?: string
}

export interface DashboardLayoutClientProps {
  children: ReactNode
}

export interface DashboardSidebarProps {
  isCollapsed: boolean
  onToggle: () => void
  mobileMenuOpen?: boolean
}

export interface DashboardHeaderProps {
  isCollapsed?: boolean
  onToggleSidebar?: () => void
  onLogout?: () => void
}
