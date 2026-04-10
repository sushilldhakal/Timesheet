"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package2, Home, Clock, Calendar, User, Lock, PanelLeft, PanelLeftClose } from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { useState, useEffect } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface StaffSidebarProps {
  isCollapsed: boolean
  mobileMenuOpen: boolean
  onToggle: () => void
  employee: any
}

const navigationItems = [
  {
    label: "Dashboard",
    href: "/staff/dashboard",
    icon: Home,
  },
  {
    label: "My Timesheet",
    href: "/staff/timesheet",
    icon: Clock,
  },
  {
    label: "My Roster",
    href: "/staff/roster",
    icon: Calendar,
  },
  {
    label: "My Profile",
    href: "/staff/profile",
    icon: User,
  },
  {
    label: "Change Password",
    href: "/staff/change-password",
    icon: Lock,
  },
]

export function StaffSidebar({ isCollapsed, mobileMenuOpen, onToggle, employee }: StaffSidebarProps) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Check on mount
    checkMobile()
    
    // Add resize listener
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleNavClick = () => {
    if (isMobile) {
      onToggle()
    }
  }

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null
  }

  const renderNavItem = (item: typeof navigationItems[0], forceExpand = false) => {
    const Icon = item.icon
    const isActive = pathname && (pathname === item.href || pathname.startsWith(item.href + "/"))
    const showLabels = forceExpand || !isCollapsed

    const link = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
          "hover:bg-success hover:text-white",
          isActive
            ? "bg-success text-white"
            : "text-primary",
          !showLabels && "justify-center"
        )}
        onClick={handleNavClick}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {showLabels && <span>{item.label}</span>}
      </Link>
    )

    if (!showLabels) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            {link}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      )
    }

    return <div key={item.href}>{link}</div>
  }

  return (
    <TooltipProvider delayDuration={300}>
      {/* Mobile Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 overflow-hidden md:hidden",
          "border-r shadow-2xl backdrop-blur-xl w-[280px] bg-background",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b h-[65px] p-4">
          <Link
            href="/staff/dashboard"
            className="flex items-center gap-3 group"
            onClick={handleNavClick}
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <Package2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <span className="text-xl font-bold">TimeSheet</span>
              <div className="text-xs text-muted-foreground">Staff Portal</div>
            </div>
          </Link>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navigationItems.map((item) => renderNavItem(item, true))}
        </nav>

        {/* Mobile Footer */}
        <div className="border-t p-4">
          <div className="text-sm">
            <div className="font-medium">{employee?.name}</div>
            <div className="text-xs text-muted-foreground">{employee?.email}</div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex flex-col transition-all duration-300 overflow-hidden",
          "border-r shadow-2xl backdrop-blur-xl bg-background",
          isCollapsed ? "w-[70px]" : "w-[280px]"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center border-b",
            isCollapsed ? "h-[70px] justify-center p-2" : "h-[65px] justify-between p-4"
          )}
        >
          <Link
            href="/staff/dashboard"
            className={cn(
              "flex items-center gap-3 group",
              isCollapsed ? "justify-center" : "justify-start"
            )}
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <Package2 className="h-6 w-6 text-primary" />
            </div>
            <div
              className={cn(
                "transition-all duration-300 overflow-hidden",
                isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
              )}
            >
              <span className="text-xl font-bold">TimeSheet</span>
              <div className="text-xs text-muted-foreground">Staff Portal</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navigationItems.map((item) => renderNavItem(item))}
        </nav>

        {/* Footer */}
        <div
          className={cn(
            "border-t",
            isCollapsed ? "p-2" : "p-4"
          )}
        >
          {/* Toggle Button */}
          <div className={cn("mb-3", isCollapsed ? "flex justify-center" : "flex justify-end")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onToggle}
                  className="p-2 rounded-lg transition-all hover:bg-primary/10 text-muted-foreground hover:text-primary"
                >
                  {isCollapsed ? (
                    <PanelLeft className="h-5 w-5" />
                  ) : (
                    <PanelLeftClose className="h-5 w-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>

          {/* User Info */}
          {!isCollapsed && (
            <div className="text-sm">
              <div className="font-medium truncate">{employee?.name}</div>
              <div className="text-xs text-muted-foreground truncate">{employee?.email}</div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
