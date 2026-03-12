"use client"

import * as React from "react"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type Table as TableType,
  type ExpandedState,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DataTablePagination } from "@/components/ui/data-table/data-table-pagination"

export interface FilterConfig {
  columnId: string
  title: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

interface BaseDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  filterConfig?: FilterConfig[]
  toolbar?: (table: TableType<TData>) => React.ReactNode
  enableRowSelection?: boolean
  onRowClick?: (row: TData) => void
  emptyMessage?: string
  getRowId?: (row: TData) => string
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => void
  expanded?: ExpandedState
  onExpandedChange?: (expanded: ExpandedState) => void
  getRowCanExpand?: (row: TData) => boolean
  renderExpandedRow?: (row: TData) => React.ReactNode | React.ReactNode[]
}

// Client-side data table (all data loaded at once)
interface ClientDataTableProps<TData, TValue> extends BaseDataTableProps<TData, TValue> {
  mode?: "client"
  searchKey?: string
  searchPlaceholder?: string
  initialPageSize?: number
  showSearch?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
}

// Server-side data table (pagination, sorting, filtering on server)
interface ServerDataTableProps<TData, TValue> extends BaseDataTableProps<TData, TValue> {
  mode: "server"
  totalCount: number
  loading?: boolean
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  showSearch?: boolean
  pageIndex: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
  showAllOption?: boolean
  sortBy?: string | null
  sortOrder?: "asc" | "desc"
  onSortChange?: (columnId: string, order: "asc" | "desc") => void
  sortableColumnIds?: string[]
}

type DataTableProps<TData, TValue> = ClientDataTableProps<TData, TValue> | ServerDataTableProps<TData, TValue>

export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  const {
    columns,
    data,
    filterConfig,
    toolbar,
    enableRowSelection = false,
    onRowClick,
    emptyMessage = "No results.",
    getRowId,
    columnVisibility,
    onColumnVisibilityChange,
    expanded,
    onExpandedChange,
    getRowCanExpand,
    renderExpandedRow,
  } = props

  const mode = props.mode || "client"

  if (mode === "server") {
    const serverProps = props as ServerDataTableProps<TData, TValue>
    return <ServerDataTableImpl {...serverProps} />
  }

  const clientProps = props as ClientDataTableProps<TData, TValue>
  const { 
    searchKey, 
    searchPlaceholder = "Search...", 
    initialPageSize = 25,
    showSearch = false,
    searchValue: controlledSearchValue,
    onSearchChange: controlledOnSearchChange,
  } = clientProps

  // Client-side state
  const [clientSorting, setClientSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [clientColumnVisibility, setClientColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [internalSearchValue, setInternalSearchValue] = React.useState("")
  const [clientExpanded, setClientExpanded] = React.useState<ExpandedState>({})

  // Use controlled or internal search state
  const searchValue = controlledSearchValue !== undefined ? controlledSearchValue : internalSearchValue
  const onSearchChange = controlledOnSearchChange || setInternalSearchValue

  // Determine if we're using controlled or uncontrolled state
  const hasControlledVisibility = columnVisibility !== undefined && onColumnVisibilityChange !== undefined
  const visibilityState = hasControlledVisibility ? columnVisibility : clientColumnVisibility
  const onVisibilityChange = hasControlledVisibility ? onColumnVisibilityChange : setClientColumnVisibility

  const hasControlledExpansion = expanded !== undefined && onExpandedChange !== undefined
  const expansionState = hasControlledExpansion ? expanded : clientExpanded
  const onExpansionChange = hasControlledExpansion ? onExpandedChange : setClientExpanded

  const hasExpansion = renderExpandedRow != null

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: clientSorting,
      columnFilters,
      columnVisibility: visibilityState,
      globalFilter: searchValue,
      rowSelection,
      ...(hasExpansion ? { expanded: expansionState } : {}),
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize,
      },
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setClientSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: onVisibilityChange,
    onGlobalFilterChange: onSearchChange,
    onExpandedChange: hasExpansion
      ? (updaterOrValue) => {
          const next =
            typeof updaterOrValue === "function"
              ? updaterOrValue(expansionState)
              : updaterOrValue
          onExpansionChange(next)
        }
      : undefined,
    getRowCanExpand: hasExpansion && getRowCanExpand ? (row) => getRowCanExpand(row.original) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getExpandedRowModel: hasExpansion ? getExpandedRowModel() : undefined,
    ...(getRowId && { getRowId }),
  })

  return (
    <div className="flex flex-col">
      {showSearch && (
        <div className="flex items-center gap-2 p-4 border-b">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )}
      {toolbar && toolbar(table)}
      <div className="overflow-hidden border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && "selected"}
                    className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {hasExpansion && row.getIsExpanded() && renderExpandedRow && (() => {
                    const content = renderExpandedRow(row.original)
                    const isArray = Array.isArray(content)
                    if (isArray && content.length >= columns.length) {
                      return (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          {columns.map((_, i) => (
                            <TableCell key={i} className="py-3 align-top">
                              {content[i] ?? null}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    }
                    return (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={columns.length} className="py-3">
                          {content as React.ReactNode}
                        </TableCell>
                      </TableRow>
                    )
                  })()}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="p-4 border-t">
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}

// Server-side implementation
function ServerDataTableImpl<TData, TValue>({
  columns,
  data,
  totalCount,
  loading = false,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  showSearch = true,
  pageIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 50],
  showAllOption = false,
  filterConfig,
  toolbar,
  enableRowSelection = false,
  onRowClick,
  emptyMessage = "No results.",
  getRowId,
  columnVisibility,
  onColumnVisibilityChange,
  sortBy = null,
  sortOrder = "asc",
  onSortChange,
  sortableColumnIds = [],
  expanded,
  onExpandedChange,
  getRowCanExpand,
  renderExpandedRow,
}: ServerDataTableProps<TData, TValue>) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [clientColumnVisibility, setClientColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [clientExpanded, setClientExpanded] = React.useState<ExpandedState>({})

  // Determine if we're using controlled or uncontrolled state
  const hasControlledVisibility = columnVisibility !== undefined && onColumnVisibilityChange !== undefined
  const visibilityState = hasControlledVisibility ? columnVisibility : clientColumnVisibility
  const onVisibilityChange = hasControlledVisibility ? onColumnVisibilityChange : setClientColumnVisibility

  const hasControlledExpansion = expanded !== undefined && onExpandedChange !== undefined
  const expansionState = hasControlledExpansion ? expanded : clientExpanded
  const onExpansionChange = hasControlledExpansion ? onExpandedChange : setClientExpanded

  const hasExpansion = renderExpandedRow != null

  // Calculate page count
  const pageCount = pageSize >= totalCount ? 1 : Math.ceil(totalCount / pageSize) || 1

  // Handle server-side sorting
  const sorting: SortingState = sortBy ? [{ id: sortBy, desc: sortOrder === "desc" }] : []

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      columnFilters,
      columnVisibility: visibilityState,
      rowSelection,
      sorting,
      ...(hasExpansion ? { expanded: expansionState } : {}),
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: onVisibilityChange,
    onSortingChange: (updater) => {
      if (!onSortChange) return
      
      const newSorting = typeof updater === "function" ? updater(sorting) : updater
      
      if (newSorting.length > 0) {
        const sort = newSorting[0]
        onSortChange(sort.id, sort.desc ? "desc" : "asc")
      } else {
        // Clear sorting
        onSortChange("", "asc")
      }
    },
    onExpandedChange: hasExpansion
      ? (updaterOrValue) => {
          const next =
            typeof updaterOrValue === "function"
              ? updaterOrValue(expansionState)
              : updaterOrValue
          onExpansionChange(next)
        }
      : undefined,
    getRowCanExpand: hasExpansion && getRowCanExpand ? (row) => getRowCanExpand(row.original) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getExpandedRowModel: hasExpansion ? getExpandedRowModel() : undefined,
    manualPagination: true,
    manualSorting: true,
    ...(getRowId && { getRowId }),
  })

  return (
    <div className="flex flex-col">
      {showSearch && (
        <div className="flex items-center gap-2 p-4 border-b">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )}
      {toolbar && toolbar(table)}
      <div className="overflow-hidden border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && "selected"}
                    className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {hasExpansion && row.getIsExpanded() && renderExpandedRow && (() => {
                    const content = renderExpandedRow(row.original)
                    const isArray = Array.isArray(content)
                    if (isArray && content.length >= columns.length) {
                      return (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          {columns.map((_, i) => (
                            <TableCell key={i} className="py-3 align-top">
                              {content[i] ?? null}
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    }
                    return (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={columns.length} className="py-3">
                          {content as React.ReactNode}
                        </TableCell>
                      </TableRow>
                    )
                  })()}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="p-4 border-t">
        <ServerDataTablePagination
        table={table}
        totalCount={totalCount}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={pageCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={pageSizeOptions}
        showAllOption={showAllOption}
      />
      </div>
    </div>
  )
}

// Server-side pagination component
interface ServerDataTablePaginationProps<TData> {
  table: TableType<TData>
  totalCount: number
  pageIndex: number
  pageSize: number
  pageCount: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions: number[]
  showAllOption?: boolean
}

function ServerDataTablePagination<TData>({
  table,
  totalCount,
  pageIndex,
  pageSize,
  pageCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  showAllOption = false,
}: ServerDataTablePaginationProps<TData>) {
  const displayPageSize = pageSize >= 99999 ? "All" : String(pageSize)

  return (
    <div className="flex items-center justify-between px-2">
      <div className="text-muted-foreground flex-1 text-sm">
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <span>
            {table.getFilteredSelectedRowModel().rows.length} of {totalCount} row(s) selected.
          </span>
        )}
        {table.getFilteredSelectedRowModel().rows.length === 0 && (
          <span>{totalCount} row(s) total.</span>
        )}
      </div>
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <select
            value={displayPageSize}
            onChange={(e) => {
              const value = e.target.value
              onPageSizeChange(value === "All" ? 99999 : parseInt(value, 10))
            }}
            className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
            {showAllOption && <option value="All">All</option>}
          </select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <button
            className="h-8 w-8 rounded-md border border-input bg-background disabled:opacity-50"
            onClick={() => onPageChange(0)}
            disabled={pageIndex <= 0}
          >
            <span className="sr-only">Go to first page</span>
            ⟪
          </button>
          <button
            className="h-8 w-8 rounded-md border border-input bg-background disabled:opacity-50"
            onClick={() => onPageChange(pageIndex - 1)}
            disabled={pageIndex <= 0}
          >
            <span className="sr-only">Go to previous page</span>
            ‹
          </button>
          <button
            className="h-8 w-8 rounded-md border border-input bg-background disabled:opacity-50"
            onClick={() => onPageChange(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <span className="sr-only">Go to next page</span>
            ›
          </button>
          <button
            className="h-8 w-8 rounded-md border border-input bg-background disabled:opacity-50"
            onClick={() => onPageChange(pageCount - 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <span className="sr-only">Go to last page</span>
            ⟫
          </button>
        </div>
      </div>
    </div>
  )
}