'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { BreadcrumbsProvider } from '@/components/providers/BreadcrumbsProvider';
import useDashboardStore from '@/lib/store';
import { useAuth } from '@/lib/hooks/use-auth';
import { cn } from '@/lib/utils/cn';
import { useLayout } from '@/components/providers/LayoutProvider';
import type { DashboardLayoutClientProps } from '@/lib/types/dashboard';

/**
 * Dashboard Layout Client Component
 * Migrated from dashboard/src/layouts/DashboardLayout.tsx
 * Handles client-side layout rendering and state
 */
export function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
    const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, toggleMobileMenu, setMobileMenuOpen } = useDashboardStore();
    const { logout } = useAuth();
    const { isFullWidth } = useLayout();
    const pathname = usePathname() ?? '';
    const isSchedulingRoute =
        pathname === '/dashboard/scheduling' || pathname.startsWith('/dashboard/scheduling/');
    const layoutFullWidth = isFullWidth || isSchedulingRoute;

    const handleLogout = () => {
        logout();
    };

    const toggleSidebar = () => {
        // On mobile, toggle mobile menu; on desktop, toggle sidebar collapse
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            toggleMobileMenu();
        } else {
            setSidebarCollapsed(!sidebarCollapsed);
        }
    };

    // Close mobile menu when window is resized to desktop size
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768 && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [mobileMenuOpen, setMobileMenuOpen]);

    // Auto-collapse sidebar when width is 768px–1024px (more room for dashboard).
    // Only collapse when *entering* that range so user can still expand and it stays expanded.
    const prevWidthRef = useRef<number | null>(null);
    useEffect(() => {
        const inTabletRange = (width: number) => width >= 768 && width < 1024;
        const syncSidebarForWidth = () => {
            const w = window.innerWidth;
            const prev = prevWidthRef.current;
            const nowInTabletRange = inTabletRange(w);
            const justEnteredTabletRange = prev !== null && !inTabletRange(prev) && nowInTabletRange;
            if (prev === null) {
                // Initial load: collapse if already in tablet range
                if (nowInTabletRange) setSidebarCollapsed(true);
            } else if (justEnteredTabletRange) {
                setSidebarCollapsed(true);
            }
            prevWidthRef.current = w;
        };

        syncSidebarForWidth();
        window.addEventListener('resize', syncSidebarForWidth);
        return () => window.removeEventListener('resize', syncSidebarForWidth);
    }, [setSidebarCollapsed]);

    return (
        <BreadcrumbsProvider>
            <div
                data-dashboard-layout={layoutFullWidth ? 'full' : 'boxed'}
                className="relative flex min-h-screen w-full min-w-0 bg-linear-to-br from-background via-background to-muted/40"
            >
                {/* Ambient accents */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute left-8 top-8 z-0 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 right-0 z-0 h-52 w-52 rounded-full bg-emerald-400/10 blur-3xl"
                />

                {/* Mobile Overlay */}
                {mobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 md:hidden"
                        onClick={toggleMobileMenu}
                    />
                )}

                {/* Sidebar */}
                <DashboardSidebar
                    isCollapsed={sidebarCollapsed}
                    onToggle={toggleSidebar}
                    mobileMenuOpen={mobileMenuOpen}
                />

                {/* Main Content */}
                <div
                    className={cn(
                        'relative z-10 flex flex-1 flex-col transition-all duration-300 min-w-0',
                        sidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-[280px]'
                    )}
                >
                    {/* Header */}
                    <DashboardHeader
                        isCollapsed={sidebarCollapsed}
                        onToggleSidebar={toggleSidebar}
                        onLogout={handleLogout}
                    />

                    {/* Page Content */}
                    <main className="flex flex-1 min-w-0">
                        {/* Shadcn-style: one wrapper controls width */}
                        <div
                            data-dashboard-shell
                            className={cn(
                                'flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:gap-6 lg:p-6 transition-[max-width] duration-300 min-w-0',
                                layoutFullWidth ? 'w-full max-w-none' : 'max-w-7xl mx-auto'
                            )}
                        >
                            {/* Content Container */}
                            <div
                                data-dashboard-page
                                className={cn(
                                    'relative w-full min-w-0 flex-1 rounded-2xl',
                                    'shadow-sm backdrop-blur-[2px]',
                                    layoutFullWidth ? 'p-0' : 'p-3 sm:p-4 lg:p-5'
                                )}
                            >
                                {children}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </BreadcrumbsProvider>
    );
}