'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Package2, ChevronDown, ChevronRight,
    PanelLeftClose, PanelLeft, Briefcase,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useState, useMemo, useEffect } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/lib/hooks/use-auth';
import { isAdminOrSuperAdmin, isManager, isSuperAdmin } from '@/lib/config/roles';
import { baseNavigationItems } from './dashboardNavigation';
import type { NavigationItem } from '@/lib/types/dashboard';
import type { DashboardSidebarProps } from '@/lib/types/dashboard';
import { useQuery } from '@tanstack/react-query';
import { getEmployerSettings } from '@/lib/api/employers';

/**
 * Dashboard Sidebar Component
 * Migrated from dashboard Navigation component
 * Provides collapsible navigation menu with expandable submenus
 */
export function DashboardSidebar({ isCollapsed, onToggle, mobileMenuOpen = false }: DashboardSidebarProps) {
    const pathname = usePathname();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [collapsedPopoverOpen, setCollapsedPopoverOpen] = useState<string | null>(null);
    const { user, userRole, isHydrated } = useAuth();
    const isUserAdmin = isAdminOrSuperAdmin(userRole);
    const isUserManager = isManager(userRole);
    const isSuperAdminUser = isSuperAdmin(userRole);
    // Manager and above can see managerOnly items
    const canSeeManagerItems = isUserAdmin || isUserManager;
    // Super admin in platform mode (not bound to a specific org)
    const isSuperAdminPlatformMode = isSuperAdminUser && (user?.tenantId === '__super_admin__' || !user?.tenantId);

    // Fetch pending quota request count for superadmin badge
    const { data: pendingQuotaCount = 0 } = useQuery<number>({
        queryKey: ['quota-requests-pending-count'],
        queryFn: async () => {
            const res = await fetch('/api/superadmin/quota-requests?status=pending');
            if (!res.ok) return 0;
            const data = await res.json();
            return Array.isArray(data.requests) ? data.requests.length : 0;
        },
        enabled: isSuperAdminUser,
        staleTime: 60 * 1000,
    });

    // Fetch pending org signup request count for superadmin badge
    const { data: pendingOrgRequestCount = 0 } = useQuery<number>({
        queryKey: ['org-requests-pending-count'],
        queryFn: async () => {
            const res = await fetch('/api/superadmin/org-requests?status=pending');
            if (!res.ok) return 0;
            const data = await res.json();
            return Array.isArray(data.requests) ? data.requests.length : 0;
        },
        enabled: isSuperAdminUser,
        staleTime: 60 * 1000,
    });

    // Fetch org settings to determine if Employers nav item should show
    const { data: orgSettings } = useQuery({
        queryKey: ['org-settings'],
        queryFn: () => getEmployerSettings(),
        enabled: isUserAdmin, // only admins need this
        staleTime: 5 * 60 * 1000,
    });
    const enableExternalHire = orgSettings?.enableExternalHire ?? false;

    // Filter navigation items based on user role (do not mutate shared baseNavigationItems)
    const navigationItems = useMemo(() => {
        if (!isHydrated) return baseNavigationItems;

        const canSee = (item: NavigationItem) => {
            if (item.superAdminOnly && !isSuperAdminUser) return false;
            if (item.adminOnly && !isUserAdmin) return false;
            if (item.managerOnly && !canSeeManagerItems) return false;
            // Hide org-context items from super admin in platform mode
            if (item.orgContextOnly && isSuperAdminPlatformMode) return false;
            return true;
        };

        const filtered = baseNavigationItems
            .filter((item) => {
                if (!canSee(item)) return false;
                if (item.children) {
                    const visibleChildren = item.children.filter(canSee);
                    if (visibleChildren.length === 0) return false;
                }
                return true;
            })
            .map((item) => {
                if (!item.children) return { ...item };
                let children = item.children.filter(canSee);

                // Inject Employers under Workforce when org has external hire enabled
                if (item.label === 'Workforce' && isUserAdmin && enableExternalHire) {
                    children = [
                        ...children,
                        { href: '/dashboard/employers', label: 'Employers', icon: Briefcase, adminOnly: true as const },
                    ];
                }

                return { ...item, children };
            });

        return filtered;
    }, [isHydrated, isUserAdmin, isSuperAdminUser, canSeeManagerItems, isSuperAdminPlatformMode, enableExternalHire]);

    // Auto-expand parent menu if child is active
    useEffect(() => {
        setExpandedItems((prev) => {
            const next = [...prev];
            let changed = false;
            navigationItems.forEach((item) => {
                if (item.children) {
                    const hasActiveChild = item.children.some(
                        (child) => child.href && pathname && (pathname === child.href || pathname.startsWith(child.href + '/'))
                    );
                    if (hasActiveChild && !next.includes(item.label)) {
                        next.push(item.label);
                        changed = true;
                    }
                }
            });
            return changed ? next : prev;
        });
    }, [pathname, navigationItems]);

    const toggleExpand = (label: string) => {
        setExpandedItems((prev) =>
            prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
        );
    };

    const renderNavItem = (item: NavigationItem, isChild = false, forceExpand = false) => {
        const Icon = item.icon;
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandedItems.includes(item.label);
        
        // Special handling for Dashboard link - only exact match
        const isActive = item.href 
            ? (item.href === '/dashboard' 
                ? pathname === '/dashboard' 
                : pathname && (pathname === item.href || pathname.startsWith(item.href + '/')))
            : false;
            
        const showLabels = forceExpand || !isCollapsed;

        if (hasChildren) {
            const button = (
                <button
                    onClick={() => (showLabels ? toggleExpand(item.label) : undefined)}
                    type="button"
                    className={cn(
                        'sidebar-nav-item w-full respect-motion-preference',
                        !showLabels && 'justify-center',
                        isActive && 'data-[active=true]',
                        !showLabels && 'data-[collapsed=true]'
                    )}
                    data-active={isActive}
                    data-collapsed={!showLabels}
                    aria-expanded={showLabels ? isExpanded : undefined}
                    aria-label={!showLabels ? `${item.label} menu` : undefined}
                >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {showLabels && (
                        <>
                            <span className="flex-1 text-left">{item.label}</span>
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </>
                    )}
                </button>
            );

            // Collapsed sidebar: show popover to the right with child links
            if (!showLabels) {
                return (
                    <div key={item.label} className="space-y-1">
                        <Popover
                            open={collapsedPopoverOpen === item.label}
                            onOpenChange={(open) => setCollapsedPopoverOpen(open ? item.label : null)}
                        >
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                        {button}
                                    </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="font-medium">
                                    {item.label} — click to open menu
                                </TooltipContent>
                            </Tooltip>
                            <PopoverContent
                                side="right"
                                align="start"
                                sideOffset={8}
                                className="w-56 p-2 rounded-lg border bg-popover shadow-lg"
                                onCloseAutoFocus={(e) => e.preventDefault()}
                            >
                                <div className="px-2 py-1.5 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                                    {item.label}
                                </div>
                                <nav className="flex flex-col gap-0.5">
                                    {item.children!.map((child) => {
                                        if (!child.href) return null;
                                        const ChildIcon = child.icon;
                                        const isChildActive = pathname && (
                                            pathname === child.href || pathname.startsWith(child.href + '/'));
                                        return (
                                            <Tooltip key={child.href}>
                                                <TooltipTrigger asChild>
                                                    <Link
                                                        href={child.href}
                                                        onClick={() => setCollapsedPopoverOpen(null)}
                                                        className={cn(
                                                            'sidebar-nav-item text-sm gap-2',
                                                            isChildActive && 'data-[active=true]'
                                                        )}
                                                        data-active={isChildActive}
                                                    >
                                                        <ChildIcon className="h-4 w-4 shrink-0" />
                                                        <span className="truncate">{child.label}</span>
                                                    </Link>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="font-medium">
                                                    {child.label}
                                                </TooltipContent>
                                            </Tooltip>
                                        );
                                    })}
                                </nav>
                            </PopoverContent>
                        </Popover>
                    </div>
                );
            }

            // Expanded sidebar: normal inline expand
            return (
                <div key={item.label} className="space-y-1">
                    {button}
                    {isExpanded && (
                        <div className="ml-4 space-y-1 border-l-2 border-sidebar-border pl-2">
                            {item.children!.map((child) => renderNavItem(child, true, forceExpand))}
                        </div>
                    )}
                </div>
            );
        }

        const isQuotaRequests = item.href === '/dashboard/superadmin/quota-requests';
        const isOrgRequests = item.href === '/dashboard/superadmin/org-requests';
        const badgeCount = isQuotaRequests ? pendingQuotaCount : isOrgRequests ? pendingOrgRequestCount : 0;
        const showBadge = badgeCount > 0;

        const link = (
            <Link
                href={item.href!}
                className={cn(
                    'sidebar-nav-item focus-enhanced respect-motion-preference',
                    isActive && 'data-[active=true]',
                    !showLabels && 'data-[collapsed=true]',
                    isChild && 'text-sm'
                )}
                data-active={isActive}
                data-collapsed={!showLabels}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        onToggle();
                    }
                }}
            >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {showLabels && <span className="flex-1">{item.label}</span>}
                {showBadge && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                        {badgeCount}
                    </span>
                )}
            </Link>
        );

        if (!showLabels && !isChild) {
            return (
                <Tooltip key={item.href || item.label}>
                    <TooltipTrigger asChild>
                        {link}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                        {item.label}
                    </TooltipContent>
                </Tooltip>
            );
        }

        return <div key={item.href || item.label}>{link}</div>;
    };

    return (
        <TooltipProvider delayDuration={300}>
            {/* Mobile Sidebar */}
            <div
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-300 overflow-hidden md:hidden',
                    'border-r shadow-2xl backdrop-blur-xl w-[280px]',
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ height: '100vh' }}
            >
                {/* Mobile Header */}
                <div className="flex items-center justify-between border-b backdrop-blur-xs h-[65px] p-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 group transition-all duration-300 hover:scale-105"
                        onClick={onToggle}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative  p-2 rounded-lg">
                                <Package2 className="h-6 w-6" aria-hidden="true" />
                            </div>
                        </div>
                        <div>
                            <span className="text-xl font-bold bg-clip-text">
                                TimeSheet
                            </span>
                            <div className="text-xs text-muted-foreground font-medium tracking-wide">Dashboard</div>
                        </div>
                    </Link>
                </div>

                {/* Mobile Navigation - always show labels (forceExpand) */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {navigationItems.map((item) => renderNavItem(item, false, true))}
                </nav>

                {/* Mobile Footer */}
                <div className="border-t backdrop-blur-xs p-4">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>System Online</span>
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div
                className={cn(
                    'hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex flex-col transition-all duration-300 overflow-hidden',
                    'border-r shadow-2xl backdrop-blur-xl',
                    isCollapsed ? 'w-[70px]' : 'w-[280px]'
                )}
                style={{ height: '100vh' }}
            >
                {/* Header/Branding */}
                <div
                    className={cn(
                        'flex items-center border-b',
                        isCollapsed ? 'h-[70px] justify-center p-2' : 'h-[65px] justify-between p-4'
                    )}
                >
                    <Link
                        href="/dashboard"
                        className={cn(
                            'flex items-center gap-3 group transition-all duration-300 hover:scale-105',
                            isCollapsed ? 'justify-center' : 'justify-start'
                        )}
                        aria-label="Dashboard Home"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative  p-2 rounded-lg">
                                <Package2 className="h-6 w-6" aria-hidden="true" />
                            </div>
                        </div>
                        <div
                            className={cn(
                                'transition-all duration-300 overflow-hidden',
                                isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
                            )}
                        >
                            <span className="text-xl font-bold bg-clip-text">
                                TimeSheet
                            </span>
                            <div className="text-xs text-muted-foreground font-medium tracking-wide">Dashboard</div>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {navigationItems.map((item) => renderNavItem(item))}
                </nav>

                {/* Footer with Toggle Button */}
                <div
                    className={cn(
                        'border-t',
                        isCollapsed ? 'p-2' : 'p-4'
                    )}
                >
                    {/* Toggle Button */}
                    <div className={cn('mb-3', isCollapsed ? 'flex justify-center' : 'flex justify-end')}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={onToggle}
                                    className={cn(
                                        'p-2 rounded-lg transition-all',
                                        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                        'text-sidebar-foreground/60',
                                        'hover:text-sidebar-accent-foreground'
                                    )}
                                    aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                >
                                    {isCollapsed ? (
                                        <PanelLeft className="h-5 w-5" />
                                    ) : (
                                        <PanelLeftClose className="h-5 w-5" />
                                    )}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-medium">
                                {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            </TooltipContent>
                        </Tooltip>
                    </div>

                    {/* System Status */}
                    <div
                        className={cn(
                            'flex items-center gap-3 text-xs text-muted-foreground',
                            isCollapsed ? 'justify-center' : 'justify-start'
                        )}
                    >
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span
                            className={cn(
                                'transition-all duration-300',
                                isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'
                            )}
                        >
                            System Online
                        </span>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}
