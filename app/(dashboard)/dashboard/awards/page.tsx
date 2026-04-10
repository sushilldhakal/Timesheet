"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Eye, Edit, Play, Award, Settings, TestTube, FileText, CircleDollarSign, Loader2 } from "lucide-react"
import { CreateAwardDialog } from "@/components/awards/create-award-dialog"
import { EditAwardDialog } from "@/components/awards/edit-award-dialog"
import { TestAwardDialog } from "@/components/awards/test-award-dialog"
import { ViewAwardDialog } from "@/components/awards/view-award-dialog"

const awardTabs = [
  { id: "overview", label: "Overview", icon: Award },
  { id: "create", label: "Create Award", icon: Plus },
  { id: "rules", label: "Rule Engine", icon: Settings },
  { id: "testing", label: "Test Scenarios", icon: TestTube },
  { id: "documentation", label: "Documentation", icon: FileText },
] as const

const TAB_DESCRIPTIONS: Record<string, string> = {
  overview: "Manage and view all award configurations with penalty rates and break entitlements.",
  create: "Create new awards with rules, tags, and penalty rate configurations.",
  rules: "Configure rule specificity engine and award tag behaviors.",
  testing: "Test award scenarios and rule competition outcomes.",
  documentation: "View award system documentation and best practices.",
}

const ADD_BUTTON_LABELS: Record<string, string> = {
  overview: "Create Award",
  create: "Create Award", 
  rules: "Add Rule",
  testing: "New Test",
  documentation: "Add Guide",
}

export default function AwardsPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAward, setSelectedAward] = useState<any>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [awards, setAwards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAwards()
  }, [])

  const fetchAwards = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/awards")
      if (!res.ok) throw new Error("Failed to fetch awards")
      const data = await res.json()
      setAwards(data.awards || [])
    } catch (err) {
      console.error("Error fetching awards:", err)
      setAwards([])
    } finally {
      setLoading(false)
    }
  }

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

  const handleAddClick = () => {
    if (activeTab === "overview" || activeTab === "create") {
      setCreateDialogOpen(true)
    }
  }

  const handleCreateClose = (open: boolean) => {
    if (!open) {
      setCreateDialogOpen(false)
      fetchAwards()
    }
  }

  const handleEditClose = (open: boolean) => {
    if (!open) {
      setEditDialogOpen(false)
      setSelectedAward(null)
      fetchAwards()
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search awards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Awards Grid */}
            {!loading && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {filteredAwards.map((award) => (
                  <Card key={award._id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{award.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {award.description || "No description"}
                          </CardDescription>
                        </div>
                        <Badge variant={award.isActive ? "default" : "secondary"}>
                          {award.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Stats */}
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Rules:</span>
                            <span className="font-medium">{award.rules?.length || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Version:</span>
                            <span className="font-medium">{award.version || "1.0.0"}</span>
                          </div>
                        </div>

                        {/* Level Rates */}
                        {award.levelRates && award.levelRates.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-foreground mb-2">Levels & Rates:</div>
                            <div className="space-y-1 bg-muted/50 rounded p-2">
                              {award.levelRates.map((rate: any, idx: number) => (
                                <div key={idx} className="text-xs flex items-center justify-between">
                                  <span>{rate.level} ({rate.employmentType})</span>
                                  <span className="font-medium">${rate.hourlyRate.toFixed(2)}/hr</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Available Tags */}
                        {award.availableTags && award.availableTags.length > 0 && (
                          <div>
                            <div className="text-sm text-muted-foreground mb-2">Available Tags:</div>
                            <div className="flex flex-wrap gap-1">
                              {award.availableTags.map((tag: any) => (
                                <Badge key={tag.name || tag} variant="outline" className="text-xs">
                                  {typeof tag === 'string' ? tag : tag.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(award)}
                            className="flex-1"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(award)}
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTest(award)}
                            className="flex-1"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Test
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && filteredAwards.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No awards found. Create one to get started.</p>
              </div>
            )}
          </div>
        )

      case "create":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <CircleDollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Create New Award</h3>
              <p className="text-muted-foreground mb-4">
                Set up award rules, penalty rates, and break entitlements
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Award
              </Button>
            </div>
          </div>
        )

      case "rules":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Rule Engine Configuration</h3>
              <p className="text-muted-foreground">
                Configure rule specificity and award tag behaviors
              </p>
            </div>
          </div>
        )

      case "testing":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <TestTube className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Test Award Scenarios</h3>
              <p className="text-muted-foreground">
                Test rule competition and award tag outcomes
              </p>
            </div>
          </div>
        )

      case "documentation":
        return (
          <div className="space-y-6">
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Award System Documentation</h3>
              <p className="text-muted-foreground">
                Learn about rule specificity, award tags, and best practices
              </p>
            </div>
          </div>
        )

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
                    onClick={() => setActiveTab(tab.id)}
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
              <Button onClick={handleAddClick} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                {ADD_BUTTON_LABELS[activeTab]}
              </Button>
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