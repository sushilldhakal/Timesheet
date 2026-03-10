'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExternalLink, FileText, Code, Zap, Search, Maximize2, Minimize2, Github, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useTheme } from '@/components/theme-provider'
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

export default function DocsHomePage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [commandOpen, setCommandOpen] = useState(false)
  const [fullWidth, setFullWidth] = useState(false)
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || 'https://github.com'

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
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
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-semibold">
              <Link href="/docs" className="hover:text-primary hover:underline">
                Timesheet API
              </Link>
            </h1>
            <nav className="flex items-center gap-1">
              <Link
                href="/docs"
                className="rounded px-3 py-1.5 text-sm font-medium bg-muted text-foreground"
              >
                Docs
              </Link>
              <Link
                href="/docs/api"
                className="rounded px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                API
              </Link>
            </nav>
          </div>

          <div className="flex items-center flex-1 max-w-sm">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Search and quick actions (⌘K)"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search...</span>
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

        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-background">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Timesheet API Documentation
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Complete API reference for the Timesheet workforce management platform
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/docs/api">
                <FileText className="mr-2 h-4 w-4" />
                View API Documentation
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/api/openapi.json" target="_blank">
                <Code className="mr-2 h-4 w-4" />
                OpenAPI Spec
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="mr-2 h-5 w-5" />
                Interactive Documentation
              </CardTitle>
              <CardDescription>
                Explore and test API endpoints directly in your browser
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Our API documentation is powered by Scalar, providing an interactive experience where you can:
              </p>
              <ul className="text-sm space-y-2">
                <li>• Test endpoints with real requests</li>
                <li>• View detailed request/response schemas</li>
                <li>• Copy code examples in multiple languages</li>
                <li>• Authenticate and make live API calls</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="mr-2 h-5 w-5" />
                OpenAPI 3.1 Specification
              </CardTitle>
              <CardDescription>
                Standards-compliant API specification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Built with modern standards and best practices:
              </p>
              <ul className="text-sm space-y-2">
                <li>• OpenAPI 3.1 specification</li>
                <li>• Zod schema validation</li>
                <li>• Comprehensive request/response examples</li>
                <li>• Detailed error handling documentation</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">
            Explore our comprehensive API documentation and start building with the Timesheet platform.
          </p>
          <Button asChild>
            <Link href="/docs/api">
              Get Started with the API
            </Link>
          </Button>
        </div>
          </div>
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
                  runCommand(() => window.open('/api/openapi.json', '_blank'))
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