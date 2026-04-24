'use client';

import { Menu, LogOut, User, Settings, Minimize2, Maximize2, Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { getUserEmail, getUserRole } from '@/lib/utils/auth/auth';
import { useAuth } from '@/lib/hooks/use-auth';
import { useLayout } from '@/components/providers/LayoutProvider';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Breadcrumbs } from './Breadcrumbs';
import {
    Command,
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from '@/components/ui/command';
import { useEffect, useMemo, useState } from 'react';
import { isAdminOrSuperAdmin, isSuperAdmin } from '@/lib/config/roles';
import { baseNavigationItems, getFlatNavigationForSearch } from './dashboardNavigation';
import type { DashboardHeaderProps } from '@/lib/types/dashboard';
import { OrgSwitcher } from '@/components/org-switcher/OrgSwitcher';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { MultiSelect } from '@/components/ui/multi-select';
import { useDashboardLocationScope } from '@/components/providers/DashboardLocationScopeProvider';


export function DashboardHeader({ onToggleSidebar, onLogout }: DashboardHeaderProps) {
    const router = useRouter();
    const { user, userRole, isHydrated } = useAuth();
    const userEmail = getUserEmail(user);
    const displayRole = userRole ?? getUserRole(user);
    const { isFullWidth, toggleLayout } = useLayout();
    const {
        accessibleLocations,
        selectedLocationIds,
        setSelectedLocationIds,
        canSelectMultiple,
        isReady: isLocationScopeReady,
    } = useDashboardLocationScope();
    const [searchOpen, setSearchOpen] = useState(false);
    const [showLayoutToggle, setShowLayoutToggle] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const isUserAdmin = isAdminOrSuperAdmin(userRole ?? displayRole);

    // Ensure component is mounted on client
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Only show layout toggle when screen is wider than 1600px
    useEffect(() => {
        if (!isMounted) return;
        
        const mq = window.matchMedia('(min-width: 1601px)');
        const update = () => setShowLayoutToggle(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, [isMounted]);

    // Same navigation as sidebar, flattened for search; admin-only items filtered by role
    const searchItems = useMemo(() => {
        if (!isHydrated) return [];
        const isUserManager = userRole === 'manager';
        const isSuperAdminUser = isSuperAdmin(userRole ?? displayRole);
        return getFlatNavigationForSearch(
            baseNavigationItems, 
            isUserAdmin, 
            user?.id ?? undefined,
            isUserManager,
            isSuperAdminUser,
            user?.tenantId
        );
    }, [isHydrated, isUserAdmin, userRole, displayRole, user?.id, user?.tenantId]);

    // Command+K keyboard shortcut
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setSearchOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    return (
        <div className="flex h-16 items-center justify-between w-full px-6 py-3 gap-4">
            {/* Left Section: Menu + Breadcrumbs */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="md:hidden"
                    onClick={onToggleSidebar}
                >
                    <Menu className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Toggle menu</span>
                </Button>

                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="hidden md:flex"
                    onClick={onToggleSidebar}
                >
                    <Menu className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Toggle sidebar</span>
                </Button>

                <div className="min-w-0 flex-1">
                    <Breadcrumbs />
                </div>
            </div>

            {/* Center Section: Search */}
            {isHydrated && user && (
                <div className="flex items-center justify-center px-2 lg:px-4">
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="relative hidden md:flex h-9 w-48 lg:w-64 items-center gap-2 rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        title="Search (⌘K)"
                        aria-label="Search (⌘K)"
                    >
                        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="flex-1 text-left">Search...</span>
                        <kbd className="pointer-events-none hidden shrink-0 items-center gap-1 rounded border bg-background/80 px-1.5 py-0.5 font-mono text-xs font-medium opacity-70 lg:inline-flex">
                            ⌘K
                        </kbd>
                    </button>

                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setSearchOpen(true)}
                        className="shrink-0 md:hidden"
                        title="Search (⌘K)"
                        aria-label="Search (⌘K)"
                    >
                        <Search className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
            )}

            {/* Right Section: Actions + Profile */}
            {isHydrated && (
                <div className="flex items-center gap-2">
                    {user && (
                        <>
                            {/* Only show location selector if user has access to more than 1 location */}
                            {isLocationScopeReady && accessibleLocations.length > 1 && (
                                <div className="hidden lg:flex min-w-[200px] max-w-[280px] items-center gap-2 rounded-lg border bg-card px-2 py-1.5">
                                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    <MultiSelect
                                        options={accessibleLocations.map((location) => ({
                                            label: location.name,
                                            value: location.id,
                                        }))}
                                        defaultValue={selectedLocationIds}
                                        onValueChange={setSelectedLocationIds}
                                        placeholder="Select locations"
                                        className="border-0 shadow-none"
                                        minWidth="0px"
                                        maxWidth="100%"
                                        singleLine
                                        autoSize={false}
                                        responsive={{
                                            desktop: { maxCount: 5, compactMode: true }
                                        }}
                                        maxCount={5}
                                        searchable
                                        avatarView={true}
                                        closeOnSelect={!canSelectMultiple}
                                    />
                                </div>
                            )}

                            <NotificationBell userId={user.id} />

                            <OrgSwitcher
                                currentTenantId={user?.tenantId}
                                currentOrgName={user?.tenantName}
                                isSuperAdmin={isSuperAdmin(userRole ?? displayRole)}
                            />

                            <div className="hidden md:flex items-center gap-2">
                                <ModeToggle />
                                
                                {isMounted && showLayoutToggle && (
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={toggleLayout}
                                        title={isFullWidth ? 'Switch to Boxed Layout' : 'Switch to Full Width Layout'}
                                        aria-label={isFullWidth ? 'Switch to boxed layout' : 'Switch to full width layout'}
                                    >
                                        {isFullWidth ? (
                                            <Minimize2 className="h-4 w-4" aria-hidden="true" />
                                        ) : (
                                            <Maximize2 className="h-4 w-4" aria-hidden="true" />
                                        )}
                                    </Button>
                                )}
                            </div>
                        </>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="rounded-full">
                                <Avatar className="h-7 w-7">
                                    <AvatarFallback className="text-xs">
                                        {user?.name?.charAt(0).toUpperCase() || userEmail?.charAt(0).toUpperCase() || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">
                                        {user?.name || 'User'}
                                    </p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {userEmail || '—'}
                                    </p>
                                    {displayRole && (
                                        <p className="text-xs leading-none text-muted-foreground capitalize">
                                            Role: {displayRole}
                                        </p>
                                    )}
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                                <User className="mr-2 h-4 w-4" aria-hidden="true" />
                                <span>Dashboard</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                                <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                                <span>My Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onLogout} className="text-red-600 dark:text-red-400">
                                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}

            <CommandDialog className='max-w-3xl' open={searchOpen} onOpenChange={setSearchOpen}>
                <Command>
                    <CommandInput placeholder="Search or jump to..." />
                    <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    {(() => {
                        const byGroup = searchItems.reduce<Record<string, typeof searchItems>>(
                            (acc, item) => {
                                const key = item.groupLabel ?? 'Navigation';
                                if (!acc[key]) acc[key] = [];
                                acc[key].push(item);
                                return acc;
                            },
                            {}
                        );
                        return Object.entries(byGroup).map(([heading, items]) => (
                            <CommandGroup key={heading} heading={heading}>
                                {items.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <CommandItem
                                            key={item.href}
                                            onSelect={() => {
                                                router.push(item.href);
                                                setSearchOpen(false);
                                            }}
                                        >
                                            <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                                            <span>{item.label}</span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        ));
                    })()}
                    </CommandList>
                </Command>
            </CommandDialog>
        </div>
    );
}
