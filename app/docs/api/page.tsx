'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, Maximize2, Minimize2, Github, FileText, Code, Moon, Sun, Menu } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useTheme } from '@/components/theme-provider'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command'

const navItems = [
  { href: '/docs', label: 'Docs' },
  { href: '/docs/api', label: 'API' },
] as const

export default function ApiDocsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [commandOpen, setCommandOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [fullWidth, setFullWidth] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com'

  const focusScalarSearch = () => {
    const iframe = document.querySelector('iframe[id="scalar-embed"]') as HTMLIFrameElement
    iframe?.contentWindow?.postMessage({ type: 'open-search' }, '*')
  }

  const currentTheme = theme ?? 'light'

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (e.shiftKey) {
          setCommandOpen((open) => !open)
        } else {
          focusScalarSearch()
        }
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = (cb: () => void) => {
    setCommandOpen(false)
    cb()
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
    // Force iframe reload with new theme
    setIframeKey((prev) => prev + 1)
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <div
        className={cn(
          'flex flex-1 flex-col min-h-0 w-full',
          !fullWidth && 'mx-auto max-w-[1600px]'
        )}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-3 gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">
              <Link href="/docs" className="hover:text-primary hover:underline">
                Timesheet API
              </Link>
            </h1>

            {/* Desktop nav - hidden below 768px */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'rounded px-3 py-1.5 text-sm',
                    pathname === href
                      ? 'font-medium bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Mobile nav menu - visible below 768px */}
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="flex md:hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 mt-6">
                  {navItems.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setNavOpen(false)}
                      className={cn(
                        'rounded px-3 py-2.5 text-sm',
                        pathname === href
                          ? 'font-medium bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Search - hidden below 768px */}
          <div className="hidden md:flex items-center flex-1 max-w-sm min-w-0">
            <button
              type="button"
              onClick={focusScalarSearch}
              className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Search API (⌘K)"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search API...</span>
              <CommandShortcut className="ml-auto">⌘K</CommandShortcut>
            </button>
          </div>

          <div className="flex items-center gap-1">
       
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Toggle theme"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setFullWidth((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              title={fullWidth ? 'Contained width' : 'Full width'}
              aria-label="Toggle width"
            >
              {fullWidth ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              title="GitHub"
              aria-label="View on GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </header>

        <div className="min-h-0 flex-1 bg-background">
          <iframe
            key={iframeKey}
            id="scalar-embed"
            src={`/docs/api/embed?theme=${currentTheme}`}
            title="API Documentation"
            className="h-full w-full border-0"
            loading="lazy"
          />
        </div>
      </div>

      <CommandDialog
        open={commandOpen}
        onOpenChange={setCommandOpen}
        title="Command menu"
        description="Search and run quick actions."
      >
        <Command className="rounded-none border-none">
          <CommandInput placeholder="Search or run a command..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigation">
              <CommandItem
                onSelect={() => runCommand(() => router.push('/docs'))}
              >
                <FileText className="mr-2 h-4 w-4" />
                Go to Docs
                <CommandShortcut>G D</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push('/docs/api'))}
              >
                <Code className="mr-2 h-4 w-4" />
                Go to API Reference
                <CommandShortcut>G A</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Actions">
              <CommandItem
                onSelect={() =>
                  runCommand(() => window.open('/api/openapi.json/routes.ts', '_blank'))
                }
              >
                <Code className="mr-2 h-4 w-4" />
                Open OpenAPI spec (JSON)
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  )
}