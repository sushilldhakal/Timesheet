'use client';

import { ReactNode } from 'react';
import { AppShell } from './AppShell';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { PageContainer } from './PageContainer';

interface DashboardShellProps {
  children: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
  sidebarCollapsed: boolean;
  mobileMenuOpen?: boolean;
  fullWidth?: boolean;
  mobileOverlay?: ReactNode;
}

/**
 * Dashboard Shell - Structured, denser layout for operations
 * Implements dashboard variant with ambient styling and structured layout
 */
export function DashboardShell({
  children,
  sidebar,
  header,
  sidebarCollapsed,
  mobileMenuOpen = false,
  fullWidth = false,
  mobileOverlay
}: DashboardShellProps) {
  return (
    <AppShell variant="dashboard">
      {/* Mobile Overlay */}
      {mobileOverlay}

      {/* Sidebar */}
      <AppSidebar
        isCollapsed={sidebarCollapsed}
        mobileMenuOpen={mobileMenuOpen}
        variant="dashboard"
      >
        {sidebar}
      </AppSidebar>

      {/* Main Content Area */}
      <div className={`
        relative z-10 flex flex-1 flex-col transition-all duration-300 min-w-0
        ${sidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-[280px]'}
      `}>
        {/* Header */}
        <AppHeader variant="dashboard">
          {header}
        </AppHeader>

        {/* Page Container */}
        <PageContainer variant="dashboard" fullWidth={fullWidth}>
          <main id="main-content" className="focus-enhanced" tabIndex={-1}>
            {children}
          </main>
        </PageContainer>
      </div>
    </AppShell>
  );
}