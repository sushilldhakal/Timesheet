'use client';

import { Menu, LogOut, User, Settings, Minimize2, Maximize2, Search } from 'lucide-react';
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
import { getUserEmail, getUserRole } from '@/lib/utils/auth';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLayout } from '@/provider/LayoutProvider';
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
import { isAdminOrSuperAdmin } from '@/lib/utils/roles';
import { baseNavigationItems, getFlatNavigationForSearch } from './dashboardNavigation';
import type { DashboardHeaderProps } from '@/types/dashboard';


export function DashboardHeader({ onToggleSidebar, onLogout }: DashboardHeaderProps) {
    const router = useRouter();
    const { user, userRole, isHydrated } = useAuth();
    const userEmail = getUserEmail(user);
    const displayRole = userRole ?? getUserRole(user);
    const { isFullWidth, toggleLayout } = useLayout();
    const [searchOpen, setSearchOpen] = useState(false);
    const [showLayoutToggle, setShowLayoutToggle] = useState(false);
    const isUserAdmin = isAdminOrSuperAdmin(userRole ?? displayRole);

    // Only show layout toggle when screen is wider than 1600px
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1601px)');
        const update = () => setShowLayoutToggle(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    // Same navigation as sidebar, flattened for search; admin-only items filtered by role
    const searchItems = useMemo(() => {
        if (!isHydrated) return [];
        return getFlatNavigationForSearch(baseNavigationItems, isUserAdmin, user?.id ?? undefined);
    }, [isHydrated, isUserAdmin, user?.id]);

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
        <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-4 lg:px-6">
            {/* Left section: sidebar toggle + breadcrumbs */}
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={onToggleSidebar}
                >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">Toggle menu</span>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="hidden md:flex"
                    onClick={onToggleSidebar}
                >
                    <Menu className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">Toggle sidebar</span>
                </Button>

                <div className="min-w-0">
                    <Breadcrumbs />
                </div>
            </div>

            {user && (
                <>
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="relative hidden lg:flex h-8 w-40 max-w-[180px] min-w-0 items-center gap-1.5 rounded-lg border border-input bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        title="Search (⌘K)"
                        aria-label="Search (⌘K)"
                    >
                        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="flex-1 truncate text-left">Search...</span>
                        <kbd className="pointer-events-none hidden shrink-0 items-center rounded border bg-background/80 px-1 font-mono text-[10px] font-medium opacity-70 lg:inline-flex">
                            ⌘K
                        </kbd>
                    </button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearchOpen(true)}
                        className="h-9 w-9 shrink-0 lg:hidden gap-1"
                        title="Search (⌘K)"
                        aria-label="Search (⌘K)"
                    >
                        <Search className="h-4 w-4" aria-hidden="true" />
                    </Button>

                    

                    <ModeToggle />
                    {showLayoutToggle && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleLayout}
                            className="h-7 w-7 hover:bg-secondary-foreground/10 gap-1"
                            title={isFullWidth ? 'Switch to Boxed Layout' : 'Switch to Full Width Layout'}
                            aria-label={isFullWidth ? 'Switch to boxed layout' : 'Switch to full width layout'}
                        >
                            {isFullWidth ? (
                                <Minimize2 size={16} className="text-secondary-foreground" aria-hidden="true" />
                            ) : (
                                <Maximize2 size={16} className="text-secondary-foreground" aria-hidden="true" />
                            )}
                        </Button>
                    )}
                </>
            )}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback>
                                {user?.username?.charAt(0).toUpperCase() || userEmail?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {user?.username || 'User'}
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

            <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
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
        </header>
    );
}
