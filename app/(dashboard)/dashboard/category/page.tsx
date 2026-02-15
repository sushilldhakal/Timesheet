"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Briefcase, MapPin, UserCircle, Plus } from "lucide-react"
import {
  CATEGORY_TYPES,
  CATEGORY_TYPE_LABELS,
  type CategoryType,
} from "@/lib/config/category-types"
import { CategoriesTable } from "./CategoriesTable"
import { AddCategoryDialog } from "./AddCategoryDialog"
import { EditCategoryDialog } from "./EditCategoryDialog"
import { DeleteCategoryDialog } from "./DeleteCategoryDialog"

export type CategoryRow = {
  id: string
  name: string
  type: CategoryType
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

export default function CategoryPage() {
  const [activeType, setActiveType] = useState<CategoryType>(CATEGORY_TYPES.ROLE)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<CategoryRow | null>(null)
  const [deleteCategory, setDeleteCategory] = useState<CategoryRow | null>(null)

  const fetchCategories = async (type?: CategoryType) => {
    setLoading(true)
    try {
      const url = type
        ? `/api/categories?type=${encodeURIComponent(type)}`
        : "/api/categories"
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setCategories(data.categories ?? [])
      } else {
        setCategories([])
      }
    } catch {
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories(activeType)
  }, [activeType])

  return (
    <>
      <div className="flex flex-col space-y-4 p-4 lg:flex-row lg:space-x-4 lg:space-y-0 lg:p-8">
        {/* Sidebar */}
        <aside className="lg:w-64">
          <Card className="flex flex-col gap-6 rounded-xl border py-0">
            <nav className="flex flex-col space-y-0.5 p-2">
              {categoryTabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <Button
                    key={tab.id}
                    onClick={() => setActiveType(tab.id)}
                    variant={activeType === tab.id ? "default" : "ghost"}
                    className="justify-start"
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
                <CardTitle>{CATEGORY_TYPE_LABELS[activeType]}</CardTitle>
                <CardDescription className="mt-1">
                  {TAB_DESCRIPTIONS[activeType]}
                </CardDescription>
              </div>
              <Button onClick={() => setAddOpen(true)} size="sm">
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
                  onEdit={setEditCategory}
                  onDelete={setDeleteCategory}
                  onRefresh={() => fetchCategories(activeType)}
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
          fetchCategories(activeType)
        }}
      />

      {editCategory && (
        <EditCategoryDialog
          category={editCategory}
          open={!!editCategory}
          onOpenChange={(open) => !open && setEditCategory(null)}
          onSuccess={() => {
            setEditCategory(null)
            fetchCategories(activeType)
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
            fetchCategories(activeType)
          }}
        />
      )}
    </>
  )
}
