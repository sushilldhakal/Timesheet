'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardHeader } from './DashboardHeader';
import { BreadcrumbsProvider } from '@/components/providers/BreadcrumbsProvider';
import { DashboardLocationScopeProvider } from '@/components/providers/DashboardLocationScopeProvider';
import { DashboardShell } from '@/components/shared/shells/DashboardShell';
import { PageContent } from '@/components/shared/shells/PageContent';
import useDashboardStore from '@/lib/store';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLayout } from '@/components/providers/LayoutProvider';
import type { DashboardLayoutClientProps } from '@/lib/types/dashboard';

/**
 * Dashboard Layout Client Component
 * Migrated to use unified DashboardShell
 */
export function DashboardLayoutClient({ children }: DashboardLayoutClientProps) {
    const { sidebarCollapsed, setSidebarCollapsed, mobileMenuOpen, toggleMobileMenu, setMobileMenuOpen } = useDashboardStore();
    const { logout, isLoading: isAuthLoading, user: authUser } = useAuth();
    const { isFullWidth } = useLayout();
    const pathname = usePathname() ?? '';
    const isSchedulingRoute =
        pathname === '/dashboard/scheduling' || pathname.startsWith('/dashboard/scheduling/');
    const layoutFullWidth = isFullWidth || isSchedulingRoute;
    const [isMounted, setIsMounted] = useState(false);

    // Ensure component is mounted before checking window
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleLogout = () => {
        logout();
    };

    const toggleSidebar = () => {
        // On mobile, toggle mobile menu; on desktop, toggle sidebar collapse
        if (isMounted && window.innerWidth < 768) {
            toggleMobileMenu();
        } else {
            setSidebarCollapsed(!sidebarCollapsed);
        }
    };

    // Close mobile menu when window is resized to desktop size
    useEffect(() => {
        if (!isMounted) return;
        
        const handleResize = () => {
            if (window.innerWidth >= 768 && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [mobileMenuOpen, setMobileMenuOpen, isMounted]);

    // Auto-collapse sidebar when width is 768px–1024px (more room for dashboard).
    // Only collapse when *entering* that range so user can still expand and it stays expanded.
    const prevWidthRef = useRef<number | null>(null);
    useEffect(() => {
        if (!isMounted) return;
        
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
    }, [setSidebarCollapsed, isMounted]);

    // Mobile overlay component
    const mobileOverlay = mobileMenuOpen ? (
        <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={toggleMobileMenu}
        />
    ) : null;

    const contentVariant = layoutFullWidth ? 'workspace' : 'default';

    const renderContent = () => {
        if (!isMounted || isAuthLoading) {
            return (
                <PageContent variant={contentVariant}>
                    <div className="flex items-center justify-center flex-1 min-h-[50vh]">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground">Verifying authentication...</p>
                        </div>
                    </div>
                </PageContent>
            )
        }
        if (!authUser) {
            return (
                <PageContent variant={contentVariant}>
                    <div className="flex items-center justify-center flex-1 min-h-[50vh]">
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">Redirecting to login...</p>
                        </div>
                    </div>
                </PageContent>
            )
        }
        return (
            <PageContent variant={contentVariant}>
                {children}
            </PageContent>
        )
    }

    return (
        <BreadcrumbsProvider>
            <DashboardLocationScopeProvider>
                <DashboardShell
                    sidebarCollapsed={sidebarCollapsed}
                    mobileMenuOpen={mobileMenuOpen}
                    fullWidth={layoutFullWidth}
                    mobileOverlay={mobileOverlay}
                    sidebar={
                        <DashboardSidebar
                            isCollapsed={sidebarCollapsed}
                            onToggle={toggleSidebar}
                            mobileMenuOpen={mobileMenuOpen}
                        />
                    }
                    header={
                        <DashboardHeader
                            isCollapsed={sidebarCollapsed}
                            onToggleSidebar={toggleSidebar}
                            onLogout={handleLogout}
                        />
                    }
                >
                    {renderContent()}
                </DashboardShell>
            </DashboardLocationScopeProvider>
        </BreadcrumbsProvider>
    );
}
