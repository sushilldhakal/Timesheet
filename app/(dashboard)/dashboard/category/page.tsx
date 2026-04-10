"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, MapPin, UserCircle, Plus, CircleDollarSign } from "lucide-react"
import { useLocations } from "@/lib/queries/locations"
import { useRoles } from "@/lib/queries/roles"
import { useEmployers } from "@/lib/queries/employers"
import { CategoriesTable } from "./CategoriesTable"
import { AddCategoryDialog } from "./AddCategoryDialog"
import { EditCategoryDialog } from "./EditCategoryDialog"
import { DeleteCategoryDialog } from "./DeleteCategoryDialog"

export type EntityType = "role" | "employer" | "location"

const ENTITY_LABELS: Record<EntityType, string> = {
  role: "Role",
  employer: "Employer",
  location: "Location",
}

export type CategoryRow = {
  id: string
  name: string
  type: EntityType
  lat?: number
  lng?: number
  radius?: number
  geofenceMode?: "hard" | "soft"
  openingHour?: number
  closingHour?: number
  workingDays?: number[]
  color?: string
  defaultScheduleTemplate?: {
    standardHoursPerWeek?: number
    shiftPattern?: any
  }
  createdAt?: string
  updatedAt?: string
}

const categoryTabs = [
  { id: "role" as EntityType, label: ENTITY_LABELS.role, icon: UserCircle },
  { id: "employer" as EntityType, label: ENTITY_LABELS.employer, icon: Briefcase },
  { id: "location" as EntityType, label: ENTITY_LABELS.location, icon: MapPin },
]

const TAB_DESCRIPTIONS: Record<EntityType, string> = {
  role: "Roles you can assign to employees (e.g. Driver, Supervisor).",
  employer: "Employers to assign to employees.",
  location: "Locations to assign to employees (sites, offices).",
}

const ADD_BUTTON_LABELS: Record<EntityType, string> = {
  role: "Add Role",
  employer: "Add Employer",
  location: "Add Location",
}

function CategoryPage() {
  const [activeType, setActiveType] = useState<EntityType>("role")
  const [addOpen, setAddOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<CategoryRow | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<CategoryRow | null>(null)

  const locationsQuery = useLocations()
  const rolesQuery = useRoles()
  const employersQuery = useEmployers()

  const rawData =
    activeType === "role"
      ? rolesQuery.data?.roles
      : activeType === "employer"
      ? employersQuery.data?.employers
      : locationsQuery.data?.locations

  const categories: CategoryRow[] = (rawData ?? []).map((item) => ({ ...item, type: activeType }))

  const loading =
    activeType === "role"
      ? rolesQuery.isLoading
      : activeType === "employer"
      ? employersQuery.isLoading
      : locationsQuery.isLoading

  const refetchCategories = () => {
    if (activeType === "role") rolesQuery.refetch()
    else if (activeType === "employer") employersQuery.refetch()
    else locationsQuery.refetch()
  }

  return (
    <>
      <div className="flex flex-col space-y-4 p-4 lg:flex-row lg:space-x-4 lg:space-y-0 lg:p-8">
        {/* Sidebar */}
        <aside className="lg:w-64">
          <Card className="flex flex-col gap-6 rounded-xl border p-4 sticky top-20">
            <nav className="flex flex-col space-y-0.5 p-2 ">
              {categoryTabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <Button
                    key={tab.id}
                    onClick={() => setActiveType(tab.id)}
                    variant={activeType === tab.id ? "default" : "ghost"}
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 ">
              <div>
                <CardTitle className="text-lg">{ENTITY_LABELS[activeType]}</CardTitle>
                <CardDescription className="mt-1 text-sm">
                  {TAB_DESCRIPTIONS[activeType]}
                </CardDescription>
              </div>
              <Button onClick={() => setAddOpen(true)} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                {ADD_BUTTON_LABELS[activeType]}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="py-8 text-center text-muted-foreground">Loading...</p>
              ) : (
                <CategoriesTable
                  type={activeType}
                  categories={categories}
                  onEdit={(category) => {
                    // Find the latest version from state to ensure fresh data
                    const latest = categories.find(c => c.id === category.id)
                    setEditCategory(latest || category)
                  }}
                  onDelete={setDeleteCategory}
                  onRefresh={refetchCategories}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddCategoryDialog
        type={activeType}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => {
          setAddOpen(false)
          refetchCategories()
        }}
      />

      {editCategory && (
        <EditCategoryDialog
          key={editCategory.id + editCategory.updatedAt} // Force remount on data change
          category={editCategory}
          open={!!editCategory}
          onOpenChange={(open) => !open && setEditCategory(null)}
          onSuccess={() => {
            setEditCategory(null)
            refetchCategories()
          }}
        />
      )}

      {deleteCategory && (
        <DeleteCategoryDialog
          category={deleteCategory}
          open={!!deleteCategory}
          onOpenChange={(open) => !open && setDeleteCategory(null)}
          onSuccess={() => {
            setDeleteCategory(null)
            refetchCategories()
          }}
        />
      )}
    </>
  )
}


export default CategoryPage
