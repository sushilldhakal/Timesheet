"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  Eye,
  Edit,
  Play,
  Award,
  Settings,
  TestTube,
  FileText,
  Loader2,
  MoreHorizontal,
  Scale,
  Tag,
  DollarSign,
  Trash2,
  Copy,
} from "lucide-react"
import { useAwards, useDeleteAward, useCreateAward } from "@/lib/queries/awards"
import { toast } from "sonner"
import { CreateAwardDialog } from "@/components/awards/create-award-dialog"
import { EditAwardDialog } from "@/components/awards/edit-award-dialog"
import { TestAwardDialog } from "@/components/awards/test-award-dialog"
import { ViewAwardDialog } from "@/components/awards/view-award-dialog"
import { RuleEngineTab } from "@/components/awards/rule-engine-tab"
import { TestScenariosTab } from "@/components/awards/test-scenarios-tab"
import { DocumentationTab } from "@/components/awards/documentation-tab"
import { RuleSimulator } from "@/components/awards/rule-simulator"

const awardTabs = [
  { id: "overview", label: "Overview", icon: Award },
  { id: "rules", label: "Rule Engine", icon: Settings },
  { id: "simulator", label: "Rule Simulator", icon: Play },
  { id: "testing", label: "Test Scenarios", icon: TestTube },
  { id: "documentation", label: "Documentation", icon: FileText },
] as const

type TabId = (typeof awardTabs)[number]["id"]

const TAB_DESCRIPTIONS: Record<TabId, string> = {
  overview: "Manage and view all award configurations with penalty rates and break entitlements.",
  rules: "Configure rule specificity engine and award tag behaviors.",
  simulator: "Test which rules match a given shift and see why they match.",
  testing: "Test award scenarios and rule competition outcomes.",
  documentation: "View award system documentation and best practices.",
}

export default function AwardsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAward, setSelectedAward] = useState<any>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)

  const awardsQuery = useAwards()
  const deleteAwardMutation = useDeleteAward()
  const createAwardMutation = useCreateAward()

  const awards = awardsQuery.data?.awards ?? []
  const loading = awardsQuery.isLoading

  // ─── Hash-based navigation ──────────────────────────
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) // Remove #
      const validTab = awardTabs.find(t => t.id === hash)
      if (validTab) {
        setActiveTab(validTab.id)
      } else if (hash === '') {
        setActiveTab('overview')
      }
    }

    // Set initial tab from hash
    handleHashChange()

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const filteredAwards = awards.filter(award =>
    award.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (award.description && award.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleEdit = (award: any) => {
    setSelectedAward(award)
    setEditDialogOpen(true)
  }

  const handleTest = (award: any) => {
    setSelectedAward(award)
    setTestDialogOpen(true)
  }

  const handleView = (award: any) => {
    setSelectedAward(award)
    setViewDialogOpen(true)
  }

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId)
    if (tabId === 'overview') {
      window.location.hash = ''
    } else {
      window.location.hash = `#${tabId}`
    }
  }

  const handleDelete = (award: any) => {
    if (!confirm(`Delete "${award.name}"? This cannot be undone.`)) return
    deleteAwardMutation.mutate(award._id, {
      onError: (error: any) => {
        toast.error(error?.error || error?.message || "Failed to delete award")
      },
    })
  }

  const handleDuplicate = (award: any) => {
    const { _id, createdAt, updatedAt, ...awardData } = award
    createAwardMutation.mutate(
      { ...awardData, name: `${award.name} (Copy)` },
      {
        onError: (error: any) => {
          toast.error(error?.error || error?.message || "Failed to duplicate award")
        },
      }
    )
  }

  const handleCreateClose = (open: boolean) => {
    if (!open) {
      setCreateDialogOpen(false)
    }
  }

  const handleEditClose = (open: boolean) => {
    if (!open) {
      setEditDialogOpen(false)
      setSelectedAward(null)
    }
  }

  const renderOverviewTab = () => (
    <div className="space-y-5">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search awards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading awards...</p>
        </div>
      )}

      {/* Awards Grid */}
      {!loading && filteredAwards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredAwards.map((award) => (
            <Card
              key={award._id}
              className="group relative transition-shadow hover:shadow-md cursor-pointer"
              onClick={() => handleView(award)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">{award.name}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2 text-xs">
                      {award.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={award.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {award.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => handleView(award)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(award)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Award
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTest(award)}>
                          <Play className="mr-2 h-4 w-4" />
                          Test Award
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(award)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(award)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <Separator className="mb-3" />
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="flex items-center justify-center text-muted-foreground">
                      <Scale className="h-3.5 w-3.5" />
                    </div>
                    <p className="mt-1 text-lg font-semibold">{(award as any).rules?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Rules</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                    </div>
                    <p className="mt-1 text-lg font-semibold">{award.levelRates?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Rates</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" />
                    </div>
                    <p className="mt-1 text-lg font-semibold">{(award as any).availableTags?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Tags</p>
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>v{(award as any).version || "1.0.0"}</span>
                  {award.updatedAt && (
                    <span>Updated {new Date(award.updatedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && awards.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Award className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-semibold">No awards yet</h3>
          <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
            Create your first award to define pay rules, penalty rates, and break entitlements.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} className="mt-5">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Award
          </Button>
        </div>
      )}

      {/* No Search Results */}
      {!loading && awards.length > 0 && filteredAwards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10">
          <Search className="h-7 w-7 text-muted-foreground" />
          <h3 className="mt-3 text-base font-semibold">No results found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No awards match &ldquo;{searchTerm}&rdquo;
          </p>
          <Button variant="outline" size="sm" onClick={() => setSearchTerm("")} className="mt-3">
            Clear Search
          </Button>
        </div>
      )}
    </div>
  )

  const renderRulesTab = () => <RuleEngineTab />

  const renderTestingTab = () => <TestScenariosTab />

  const renderDocsTab = () => <DocumentationTab />

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return renderOverviewTab()
      case "rules":
        return renderRulesTab()
      case "simulator":
        return <RuleSimulator />
      case "testing":
        return renderTestingTab()
      case "documentation":
        return renderDocsTab()
      default:
        return null
    }
  }

  return (
    <>
      <div className="flex flex-col space-y-4 p-4 lg:flex-row lg:space-x-4 lg:space-y-0 lg:p-8">
        {/* Sidebar */}
        <aside className="lg:w-64">
          <Card className="flex flex-col gap-6 rounded-xl border p-4 sticky top-20">
            <nav className="flex flex-col space-y-0.5 p-2">
              {awardTabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <Button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    className="justify-start text-sm rounded-md"
                  >
                    <IconComponent className="mr-2 h-4 w-4" />
                    {tab.label}
                  </Button>
                )
              })}
            </nav>
          </Card>
        </aside>

        {/* Content */}
        <div className="flex-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg">
                  {awardTabs.find(tab => tab.id === activeTab)?.label}
                </CardTitle>
                <CardDescription className="mt-1 text-sm">
                  {TAB_DESCRIPTIONS[activeTab]}
                </CardDescription>
              </div>
              {activeTab === "overview" && (
                <Button onClick={() => setCreateDialogOpen(true)} size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Award
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <CreateAwardDialog
        open={createDialogOpen}
        onOpenChange={handleCreateClose}
      />

      {selectedAward && (
        <>
          <EditAwardDialog
            award={selectedAward}
            open={editDialogOpen}
            onOpenChange={handleEditClose}
          />
          <TestAwardDialog
            award={selectedAward}
            open={testDialogOpen}
            onOpenChange={setTestDialogOpen}
          />
          <ViewAwardDialog
            award={selectedAward}
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
          />
        </>
      )}
    </>
  )
}
