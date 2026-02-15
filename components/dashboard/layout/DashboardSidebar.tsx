'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Package2, ChevronDown, ChevronRight,
    PanelLeftClose, PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { useAuth } from '@/lib/hooks/useAuth';
import { isAdmin } from '@/lib/utils/roles';
import { baseNavigationItems, type NavigationItem } from './dashboardNavigation';
import type { DashboardSidebarProps } from '@/types/dashboard';

/**
 * Dashboard Sidebar Component
 * Migrated from dashboard Navigation component
 * Provides collapsible navigation menu with expandable submenus
 */
export function DashboardSidebar({ isCollapsed, onToggle, mobileMenuOpen = false }: DashboardSidebarProps) {
    const pathname = usePathname();
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [collapsedPopoverOpen, setCollapsedPopoverOpen] = useState<string | null>(null);
    const { userRole, isHydrated } = useAuth();
    const isUserAdmin = isAdmin(userRole);

    // Filter navigation items based on user role (do not mutate shared baseNavigationItems)
    const navigationItems = useMemo(() => {
        if (!isHydrated) return baseNavigationItems;

        return baseNavigationItems
            .filter((item) => {
                if (item.adminOnly && !isUserAdmin) return false;
                if (item.children) {
                    const filteredChildren = item.children.filter(
                        (child) => !child.adminOnly || isUserAdmin
                    );
                    if (filteredChildren.length === 0) return false;
                }
                return true;
            })
            .map((item) => {
                if (!item.children) return { ...item };
                const filteredChildren = item.children.filter(
                    (child) => !child.adminOnly || isUserAdmin
                );
                return { ...item, children: filteredChildren };
            });
    }, [isHydrated, isUserAdmin]);

    // Auto-expand parent menu if child is active
    useEffect(() => {
        setExpandedItems((prev) => {
            const next = [...prev];
            let changed = false;
            navigationItems.forEach((item) => {
                if (item.children) {
                    const hasActiveChild = item.children.some(
                        (child) => child.href && (pathname === child.href || pathname.startsWith(child.href + '/'))
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
        const isActive = item.href && (pathname === item.href || pathname.startsWith(item.href + '/'));
        const showLabels = forceExpand || !isCollapsed;

        if (hasChildren) {
            const button = (
                <button
                    onClick={() => (showLabels ? toggleExpand(item.label) : undefined)}
                    type="button"
                    className={cn(
                        'w-full flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
                        'hover:bg-blue-100 dark:hover:bg-slate-800',
                        'text-slate-700 dark:text-slate-300',
                        !showLabels && 'justify-center'
                    )}
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
                                className="w-56 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg"
                                onCloseAutoFocus={(e) => e.preventDefault()}
                            >
                                <div className="px-2 py-1.5 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                    {item.label}
                                </div>
                                <nav className="flex flex-col gap-0.5">
                                    {item.children!.map((child) => {
                                        if (!child.href) return null;
                                        const ChildIcon = child.icon;
                                        const isChildActive =
                                            pathname === child.href || pathname.startsWith(child.href + '/');
                                        return (
                                            <Tooltip key={child.href}>
                                                <TooltipTrigger asChild>
                                                    <Link
                                                        href={child.href}
                                                        onClick={() => setCollapsedPopoverOpen(null)}
                                                        className={cn(
                                                            'flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
                                                            'hover:bg-blue-100 dark:hover:bg-slate-800',
                                                            isChildActive
                                                                ? 'bg-blue-100 dark:bg-slate-800 text-blue-700 dark:text-blue-300 font-medium'
                                                                : 'text-slate-700 dark:text-slate-300'
                                                        )}
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
                        <div className="ml-4 space-y-1 border-l-2 border-blue-200 dark:border-slate-700 pl-2">
                            {item.children!.map((child) => renderNavItem(child, true, forceExpand))}
                        </div>
                    )}
                </div>
            );
        }

        const link = (
            <Link
                href={item.href!}
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
                    'hover:bg-blue-100 dark:hover:bg-slate-800',
                    isActive
                        ? 'bg-blue-200 dark:bg-slate-700 text-blue-900 dark:text-blue-100'
                        : 'text-slate-700 dark:text-slate-300',
                    !showLabels && 'justify-center',
                    isChild && 'text-sm'
                )}
                onClick={() => {
                    // Close mobile menu when clicking a link on mobile
                    if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        onToggle();
                    }
                }}
            >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {showLabels && <span>{item.label}</span>}
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
                    'bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900',
                    'border-r border-blue-200 dark:border-slate-700/50 shadow-2xl backdrop-blur-xl w-[280px]',
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                )}
                style={{ height: '100vh' }}
            >
                {/* Mobile Header */}
                <div className="flex items-center justify-between border-b border-slate-700/50 bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-xs h-[80px] p-4">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 group transition-all duration-300 hover:scale-105"
                        onClick={onToggle}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                                <Package2 className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                        </div>
                        <div>
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                TimeSheet
                            </span>
                            <div className="text-xs text-slate-400 font-medium tracking-wide">Dashboard</div>
                        </div>
                    </Link>
                </div>

                {/* Mobile Navigation - always show labels (forceExpand) */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                    {navigationItems.map((item) => renderNavItem(item, false, true))}
                </nav>

                {/* Mobile Footer */}
                <div className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>System Online</span>
                    </div>
                </div>
            </div>

            {/* Desktop Sidebar */}
            <div
                className={cn(
                    'hidden md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex flex-col transition-all duration-300 overflow-hidden',
                    'bg-gradient-to-b from-blue-50 via-blue-100 to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900',
                    'border-r border-blue-200 dark:border-slate-700/50 shadow-2xl backdrop-blur-xl',
                    isCollapsed ? 'w-[70px]' : 'w-[280px]'
                )}
                style={{ height: '100vh' }}
            >
                {/* Header/Branding */}
                <div
                    className={cn(
                        'flex items-center border-b border-slate-700/50',
                        'bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-xs',
                        isCollapsed ? 'h-[70px] justify-center p-2' : 'h-[80px] justify-between p-4'
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
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur-sm opacity-75 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg">
                                <Package2 className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                        </div>
                        <div
                            className={cn(
                                'transition-all duration-300 overflow-hidden',
                                isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
                            )}
                        >
                            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                TimeSheet
                            </span>
                            <div className="text-xs text-slate-400 font-medium tracking-wide">Dashboard</div>
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
                                        'hover:bg-blue-100 dark:hover:bg-slate-800',
                                        'text-slate-600 dark:text-slate-400',
                                        'hover:text-blue-600 dark:hover:text-blue-400'
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
                            'flex items-center gap-3 text-xs text-slate-400',
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
