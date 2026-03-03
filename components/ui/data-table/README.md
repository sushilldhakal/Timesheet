# Dynamic Data Table Component

A flexible, reusable data table component built on top of TanStack Table with support for sorting, filtering, pagination, and row selection. Supports both client-side and server-side data handling.

## Features

- ✅ Client-side and server-side modes
- ✅ Sorting, filtering, and pagination
- ✅ Column visibility toggle
- ✅ Faceted filters with OR logic
- ✅ Row selection with checkboxes
- ✅ Customizable toolbar
- ✅ Row click handlers
- ✅ Loading states (server mode)
- ✅ Fully typed with TypeScript
- ✅ Responsive design

## Components

### DataTable
Main table component that handles all the table logic.

### DataTableToolbar
Customizable toolbar with search, filters, and actions.

### DataTableColumnHeader
Sortable column header with dropdown menu.

### DataTableFacetedFilter
Multi-select filter with badge display.

### DataTableViewOptions
Column visibility toggle dropdown.

### DataTablePagination
Pagination controls with page size selector.

### DataTableRowActions
Dropdown menu for row-level actions.

## Usage

The DataTable component supports two modes:

1. **Client Mode** - All data is loaded at once, filtering/sorting/pagination happens in the browser
2. **Server Mode** - Data is fetched page by page, filtering/sorting/pagination happens on the server

### Client Mode (Default)

Use when you have all data available and want client-side operations:

```typescript
<DataTable
  columns={columns}
  data={allData}
  searchKey="name"
  filterConfig={filterConfig}
  toolbar={(table) => <DataTableToolbar table={table} />}
/>
```

### Server Mode

Use when you have large datasets and want server-side pagination:

```typescript
<DataTable
  mode="server"
  columns={columns}
  data={currentPageData}
  totalCount={totalRecords}
  loading={isLoading}
  searchValue={searchTerm}
  onSearchChange={setSearchTerm}
  pageIndex={currentPage}
  pageSize={itemsPerPage}
  onPageChange={setCurrentPage}
  onPageSizeChange={setItemsPerPage}
  sortBy={sortColumn}
  sortOrder={sortDirection}
  onSortChange={handleSort}
  sortableColumnIds={["name", "email", "date"]}
  toolbar={(table) => <DataTableToolbar table={table} />}
/>
```

## Examples

### Example 1: Client-Side Table

### 1. Define Your Data Type

```typescript
export type Employee = {
  id: string
  name: string
  email: string
  role: string
  department: string
}
```

### 2. Create Column Definitions

```typescript
// columns.tsx
import { type ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/ui/data-table/data-table-column-header"

interface EmployeeColumnsProps {
  onEdit: (employee: Employee) => void
  onDelete: (employee: Employee) => void
}

export function getEmployeeColumns({
  onEdit,
  onDelete,
}: EmployeeColumnsProps): ColumnDef<Employee>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
    },
    {
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      filterFn: (row, columnId, filterValue) => {
        // OR logic for multi-select filters
        return filterValue.includes(row.getValue(columnId))
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" onClick={() => onEdit(row.original)}>
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(row.original)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]
}
```

### 3. Use the DataTable Component (Client Mode)

```typescript
"use client"

import { useMemo } from "react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableToolbar } from "@/components/ui/data-table/data-table-toolbar"
import type { FilterConfig } from "@/components/ui/data-table/data-table-toolbar"
import { getEmployeeColumns } from "./columns"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"

export function EmployeesTable({ employees, onEdit, onDelete, onAddNew }) {
  // Define columns
  const columns = useMemo(
    () => getEmployeeColumns({ onEdit, onDelete }),
    [onEdit, onDelete]
  )

  // Define filter configurations
  const filterConfig = useMemo<FilterConfig[]>(() => {
    const roles = Array.from(new Set(employees.map(e => e.role)))
      .map(role => ({ label: role, value: role }))

    const departments = Array.from(new Set(employees.map(e => e.department)))
      .map(dept => ({ label: dept, value: dept }))

    return [
      { columnId: "role", title: "Role", options: roles },
      { columnId: "department", title: "Department", options: departments },
    ]
  }, [employees])

  return (
    <DataTable
      columns={columns}
      data={employees}
      searchKey="name"
      searchPlaceholder="Search employees..."
      filterConfig={filterConfig}
      enableRowSelection={true}
      onRowClick={(row) => console.log("Clicked:", row)}
      emptyMessage="No employees found."
      initialPageSize={25}
      toolbar={(table) => (
        <DataTableToolbar
          table={table}
          searchKey="name"
          searchPlaceholder="Search employees..."
          filterConfig={filterConfig}
          actions={
            <Button size="sm" onClick={onAddNew}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          }
        />
      )}
    />
  )
}
```

### 4. Use the DataTable Component (Server Mode)

For server-side pagination, sorting, and filtering:

```typescript
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { DataTable } from "@/components/ui/data-table/data-table"
import { DataTableToolbar } from "@/components/ui/data-table/data-table-toolbar"
import { getEmployeeColumns } from "./columns"

export function EmployeesServerTable({ onEdit, onDelete, onAddNew }) {
  const [employees, setEmployees] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(50)
  const [sortBy, setSortBy] = useState<string | null>("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Fetch data from server
  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String(pageIndex * pageSize),
        search,
        ...(sortBy && { sortBy, order: sortOrder }),
      })
      const res = await fetch(`/api/employees?${params}`)
      const data = await res.json()
      setEmployees(data.employees)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [search, pageIndex, pageSize, sortBy, sortOrder])

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const columns = useMemo(
    () => getEmployeeColumns({ onEdit, onDelete }),
    [onEdit, onDelete]
  )

  const filterConfig = useMemo(() => {
    // Extract from current page data
    const roles = Array.from(new Set(employees.map(e => e.role)))
      .map(role => ({ label: role, value: role }))
    return [{ columnId: "role", title: "Role", options: roles }]
  }, [employees])

  return (
    <DataTable
      mode="server"
      columns={columns}
      data={employees}
      totalCount={total}
      loading={loading}
      searchValue={search}
      onSearchChange={setSearch}
      pageIndex={pageIndex}
      pageSize={pageSize}
      onPageChange={setPageIndex}
      onPageSizeChange={setPageSize}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={(col, order) => {
        setSortBy(col)
        setSortOrder(order)
      }}
      sortableColumnIds={["name", "email", "role"]}
      filterConfig={filterConfig}
      toolbar={(table) => (
        <DataTableToolbar
          table={table}
          filterConfig={filterConfig}
          actions={<Button onClick={onAddNew}>Add Employee</Button>}
        />
      )}
    />
  )
}
```

## Props

### DataTable Props (Client Mode)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `"client"` | `"client"` | Client-side data handling |
| `columns` | `ColumnDef<TData, TValue>[]` | Required | Column definitions |
| `data` | `TData[]` | Required | Table data |
| `searchKey` | `string` | - | Column key for search input |
| `searchPlaceholder` | `string` | "Search..." | Placeholder for search input |
| `filterConfig` | `FilterConfig[]` | - | Filter configurations |
| `toolbar` | `(table) => ReactNode` | - | Custom toolbar component |
| `enableRowSelection` | `boolean` | `false` | Enable row selection |
| `onRowClick` | `(row: TData) => void` | - | Row click handler |
| `emptyMessage` | `string` | "No results." | Message when no data |
| `initialPageSize` | `number` | `25` | Initial page size |
| `getRowId` | `(row: TData) => string` | - | Custom row ID function |
| `columnVisibility` | `VisibilityState` | - | Controlled column visibility |
| `onColumnVisibilityChange` | `(updater) => void` | - | Column visibility change handler |

### DataTable Props (Server Mode)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `"server"` | Required | Server-side data handling |
| `columns` | `ColumnDef<TData, TValue>[]` | Required | Column definitions |
| `data` | `TData[]` | Required | Current page data |
| `totalCount` | `number` | Required | Total number of records |
| `loading` | `boolean` | `false` | Loading state |
| `searchValue` | `string` | Required | Current search value |
| `onSearchChange` | `(value: string) => void` | Required | Search change handler |
| `searchPlaceholder` | `string` | "Search..." | Search placeholder |
| `showSearch` | `boolean` | `true` | Show/hide search input |
| `pageIndex` | `number` | Required | Current page index (0-based) |
| `pageSize` | `number` | Required | Items per page |
| `onPageChange` | `(page: number) => void` | Required | Page change handler |
| `onPageSizeChange` | `(size: number) => void` | Required | Page size change handler |
| `pageSizeOptions` | `number[]` | `[10, 20, 30, 50]` | Page size options |
| `sortBy` | `string \| null` | `null` | Current sort column |
| `sortOrder` | `"asc" \| "desc"` | `"asc"` | Current sort order |
| `onSortChange` | `(col: string, order: "asc" \| "desc") => void` | - | Sort change handler |
| `sortableColumnIds` | `string[]` | `[]` | Sortable column IDs |
| `filterConfig` | `FilterConfig[]` | - | Filter configurations |
| `toolbar` | `(table) => ReactNode` | - | Custom toolbar component |
| `enableRowSelection` | `boolean` | `false` | Enable row selection |
| `onRowClick` | `(row: TData) => void` | - | Row click handler |
| `emptyMessage` | `string` | "No results." | Message when no data |
| `getRowId` | `(row: TData) => string` | - | Custom row ID function |
| `columnVisibility` | `VisibilityState` | - | Controlled column visibility |
| `onColumnVisibilityChange` | `(updater) => void` | - | Column visibility change handler |

### DataTableToolbar Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `table` | `Table<TData>` | Required | TanStack table instance |
| `searchKey` | `string` | - | Column key for search |
| `searchPlaceholder` | `string` | "Search..." | Search placeholder |
| `filterConfig` | `FilterConfig[]` | `[]` | Filter configurations |
| `actions` | `ReactNode` | - | Custom action buttons |

### FilterConfig Type

```typescript
interface FilterConfig {
  columnId: string
  title: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}
```

## When to Use Each Mode

### Use Client Mode When:
- You have less than 1000 records
- All data can be loaded at once
- You want instant filtering/sorting without server requests
- You're working with static or cached data
- You want simpler implementation

### Use Server Mode When:
- You have thousands or millions of records
- Data needs to be fetched page by page
- You want to reduce initial load time
- You need server-side filtering/sorting
- You're working with real-time data from an API

## Advanced Features

### Custom Filter Functions

For multi-value columns (like arrays), use custom filter functions with OR logic:

```typescript
{
  accessorKey: "tags",
  accessorFn: (row) => row.tags.join(", "),
  filterFn: (row, columnId, filterValue) => {
    // OR logic: match if ANY selected value is in the row's tags
    return filterValue.some((selected: string) => 
      row.original.tags.includes(selected)
    )
  },
  header: "Tags",
}
```

### Row Actions

Use the `DataTableRowActions` component for dropdown menus:

```typescript
import { DataTableRowActions, type RowAction } from "@/components/ui/data-table/data-table-row-actions"

const actions: RowAction<Employee>[] = [
  {
    label: "Edit",
    onClick: (employee) => handleEdit(employee),
  },
  {
    label: "Delete",
    onClick: (employee) => handleDelete(employee),
    variant: "destructive",
    separator: true,
  },
]

// In column definition:
{
  id: "actions",
  cell: ({ row }) => <DataTableRowActions row={row} actions={actions} />,
}
```

### Custom Toolbar

Create a completely custom toolbar by passing a function:

```typescript
<DataTable
  toolbar={(table) => (
    <div className="flex items-center justify-between">
      <Input
        placeholder="Custom search..."
        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
        onChange={(e) => table.getColumn("name")?.setFilterValue(e.target.value)}
      />
      <Button>Custom Action</Button>
    </div>
  )}
/>
```

## Migration from Old DataTable

If you're migrating from the old data-table component:

1. Move column definitions to a separate file
2. Replace hardcoded filter data with props
3. Use `getEmployeeColumns()` pattern for dynamic columns
4. Pass `filterConfig` instead of hardcoding filters
5. Use custom `toolbar` prop for custom toolbars

## Examples

See the following files for complete examples:
- **Client Mode**: `app/(dashboard)/dashboard/employees/employees-new-table-example.tsx`
- **Server Mode**: `app/(dashboard)/dashboard/employees/employees-server-table-example.tsx`
- **Column Definitions**: `app/(dashboard)/dashboard/employees/columns.tsx`
