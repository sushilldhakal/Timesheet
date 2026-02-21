"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"
import { EmployeesTable } from "./EmployeesTable"
import { AddEmployeeDialog } from "./AddEmployeeDialog"
import { EditEmployeeDialog } from "./EditEmployeeDialog"
import { DeleteEmployeeDialog } from "./DeleteEmployeeDialog"

export type EmployeeRow = {
  id: string
  name: string
  pin: string
  role: string[]
  employer: string[]
  location: string[]
  hire: string
  site: string
  email: string
  phone: string
  dob: string
  comment: string
  img: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [sortBy, setSortBy] = useState<string | null>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [addOpen, setAddOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState<EmployeeRow | null>(null)
  const [deleteEmployee, setDeleteEmployee] = useState<EmployeeRow | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const limit = pageSize >= 99999 ? 10000 : pageSize
      const offset = pageIndex * (pageSize >= 99999 ? 10000 : pageSize)
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (sortBy) {
        params.set("sortBy", sortBy)
        params.set("order", sortOrder)
      }
      const res = await fetch(`/api/employees?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEmployees(data.employees ?? [])
        setTotal(data.total ?? 0)
      } else {
        setEmployees([])
        setTotal(0)
      }
    } catch {
      setEmployees([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, pageIndex, pageSize, sortBy, sortOrder])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  useEffect(() => {
    setPageIndex(0)
  }, [debouncedSearch])

  const handleRowClick = (row: EmployeeRow) => {
    router.push(`/dashboard/employees/${row.id}`)
  }

  const handleSortChange = (columnId: string, order: "asc" | "desc") => {
    setSortBy(columnId)
    setSortOrder(order)
    setPageIndex(0) // Reset to first page on sort
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="text-muted-foreground">
            Manage staff, roles, and timesheets.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>
            Search works across all employees. Click a row to view details and timesheet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeesTable
            employees={employees}
            total={total}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            pageIndex={pageIndex}
            pageSize={pageSize}
            onPageChange={setPageIndex}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPageIndex(0)
            }}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            onRowClick={handleRowClick}
            onEdit={setEditEmployee}
            onDelete={setDeleteEmployee}
          />
        </CardContent>
      </Card>

      <AddEmployeeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={fetchEmployees}
      />

      {editEmployee && (
        <EditEmployeeDialog
          employee={editEmployee}
          open={!!editEmployee}
          onOpenChange={(open) => !open && setEditEmployee(null)}
          onSuccess={() => {
            setEditEmployee(null)
            fetchEmployees()
          }}
        />
      )}

      {deleteEmployee && (
        <DeleteEmployeeDialog
          employee={deleteEmployee}
          open={!!deleteEmployee}
          onOpenChange={(open) => !open && setDeleteEmployee(null)}
          onSuccess={() => {
            setDeleteEmployee(null)
            fetchEmployees()
          }}
        />
      )}
    </div>
  )
}
