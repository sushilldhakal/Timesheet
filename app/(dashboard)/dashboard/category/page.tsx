"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, MapPin, UserCircle, Plus, CircleDollarSign } from "lucide-react"
import {
  CATEGORY_TYPES,
  CATEGORY_TYPE_LABELS,
  type CategoryType,
} from "@/lib/config/category-types"
import { useCategoriesByType } from "@/lib/queries/categories"
import { CategoriesTable } from "./CategoriesTable"
import { AddCategoryDialog } from "./AddCategoryDialog"
import { EditCategoryDialog } from "./EditCategoryDialog"
import { DeleteCategoryDialog } from "./DeleteCategoryDialog"

export type CategoryRow = {
  id: string
  name: string
  type: CategoryType
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
  { id: CATEGORY_TYPES.ROLE as CategoryType, label: CATEGORY_TYPE_LABELS[CATEGORY_TYPES.ROLE], icon: UserCircle },
  { id: CATEGORY_TYPES.EMPLOYER as CategoryType, label: CATEGORY_TYPE_LABELS[CATEGORY_TYPES.EMPLOYER], icon: Briefcase },
  { id: CATEGORY_TYPES.LOCATION as CategoryType, label: CATEGORY_TYPE_LABELS[CATEGORY_TYPES.LOCATION], icon: MapPin },
] as const

const TAB_DESCRIPTIONS: Record<CategoryType, string> = {
  [CATEGORY_TYPES.ROLE]: "Roles you can assign to employees (e.g. Driver, Supervisor).",
  [CATEGORY_TYPES.EMPLOYER]: "Employers to assign to employees.",
  [CATEGORY_TYPES.LOCATION]: "Locations to assign to employees (sites, offices).",
}

const ADD_BUTTON_LABELS: Record<CategoryType, string> = {
  [CATEGORY_TYPES.ROLE]: "Add Role",
  [CATEGORY_TYPES.EMPLOYER]: "Add Employer",
  [CATEGORY_TYPES.LOCATION]: "Add Location",
}

function CategoryPage() {
  const [activeType, setActiveType] = useState<CategoryType>(CATEGORY_TYPES.ROLE)
  const [addOpen, setAddOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<CategoryRow | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<CategoryRow | null>(null)

  const categoriesQuery = useCategoriesByType(activeType)

  const categories = categoriesQuery.data?.categories ?? []
  const loading = categoriesQuery.isLoading

  const refetchCategories = () => {
    categoriesQuery.refetch()
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
                <CardTitle className="text-lg">{CATEGORY_TYPE_LABELS[activeType]}</CardTitle>
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
