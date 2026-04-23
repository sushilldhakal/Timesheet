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
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DataTablePagination } from "@/components/ui/data-table/data-table-pagination"
import { useDebounce } from "@/lib/hooks/use-debounce"

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
  toolbar?: (
    table: TableType<TData>,
    search?: string,
    setSearch?: (value: string) => void,
    columnFilters?: ColumnFiltersState,
    setColumnFilters?: (filters: ColumnFiltersState) => void
  ) => React.ReactNode
  enableRowSelection?: boolean
  onRowSelectionChange?: (rows: TData[]) => void
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
  /** Applied on first mount (TanStack Table initialState). */
  initialSorting?: SortingState
  initialColumnVisibility?: VisibilityState
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
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void
}

// Virtual scrolling data table (infinite scroll with server-side fetching)
interface VirtualDataTableProps<TData, TValue> extends Omit<BaseDataTableProps<TData, TValue>, 'data'> {
  mode: "virtual"
  fetchPage: (params: {
    limit: number
    offset: number
    search?: string
    sortBy?: string
    order?: 'asc' | 'desc'
    [key: string]: any
  }) => Promise<{ employees?: TData[]; data?: TData[]; total: number }>
  pageSize?: number
  maxHeight?: string // Optional max height for scrollable container, defaults to none (auto height)
  searchPlaceholder?: string
}

type DataTableProps<TData, TValue> = ClientDataTableProps<TData, TValue> | ServerDataTableProps<TData, TValue> | VirtualDataTableProps<TData, TValue>

export function DataTable<TData, TValue>(props: DataTableProps<TData, TValue>) {
  const {
    columns,
    filterConfig,
    toolbar,
    enableRowSelection = false,
    onRowSelectionChange,
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

  // Extract data only for non-virtual modes
  const data = 'data' in props ? props.data : []

  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (mode === "server") {
    const serverProps = props as ServerDataTableProps<TData, TValue>
    return <ServerDataTableImpl {...serverProps} mounted={mounted} />
  }

  if (mode === "virtual") {
    const virtualProps = props as VirtualDataTableProps<TData, TValue>
    return <VirtualDataTableImpl {...virtualProps} mounted={mounted} />
  }

  const clientProps = props as ClientDataTableProps<TData, TValue>
  const { 
    searchKey, 
    searchPlaceholder = "Search...", 
    initialPageSize = 25,
    initialSorting,
    initialColumnVisibility,
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
      sorting: initialSorting ?? [],
      columnVisibility: initialColumnVisibility ?? {},
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

  const onRowSelectionChangeRef = React.useRef(onRowSelectionChange)
  onRowSelectionChangeRef.current = onRowSelectionChange

  React.useEffect(() => {
    onRowSelectionChangeRef.current?.(
      table.getFilteredSelectedRowModel().rows.map((r) => r.original)
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection])

  if (!mounted) {
    return (
      <div className="flex flex-col">
        <div className="overflow-hidden border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loading...</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

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
      <div className="border rounded-md">
        <div className="relative">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => {
                  const headers = headerGroup.headers
                  return (
                  <TableRow key={headerGroup.id}>
                    {headers.map((header, hIdx) => {
                      const isLastTwo = hIdx >= headers.length - 2
                      return (
                      <TableHead 
                        key={header.id} 
                        colSpan={header.colSpan}
                        style={{
                          position: 'sticky',
                          top: 0,
                          right: isLastTwo && hIdx === headers.length - 1 ? 0 : undefined,
                          zIndex: isLastTwo ? 31 : 30,
                          backgroundColor: 'hsl(var(--background))',
                          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                      )
                    })}
                  </TableRow>
                  )
                })}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row, index) => {
                    const isEven = index % 2 === 0
                    const rowBg = isEven ? 'hsl(var(--background))' : 'hsl(var(--muted) / 0.2)'
                    const visibleCells = row.getVisibleCells()
                    return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        data-state={row.getIsSelected() && "selected"}
                        className={`${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""} ${isEven ? "bg-background" : "bg-muted/20"}`}
                        onClick={() => onRowClick?.(row.original)}
                      >
                        {visibleCells.map((cell, cellIndex) => {
                          const isLastTwo = cellIndex >= visibleCells.length - 2
                          return (
                          <TableCell
                            key={cell.id}
                            style={isLastTwo ? {
                              position: 'sticky',
                              right: cellIndex === visibleCells.length - 1 ? 0 : undefined,
                              backgroundColor: rowBg,
                              zIndex: 1,
                            } : undefined}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                          )
                        })}
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
                  )})
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
        </div>
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
  columnFilters: controlledColumnFilters,
  onColumnFiltersChange: controlledOnColumnFiltersChange,
  expanded,
  onExpandedChange,
  getRowCanExpand,
  renderExpandedRow,
  mounted,
}: ServerDataTableProps<TData, TValue> & { mounted: boolean }) {
  const [internalColumnFilters, setInternalColumnFilters] = React.useState<ColumnFiltersState>([])
  const [clientColumnVisibility, setClientColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [clientExpanded, setClientExpanded] = React.useState<ExpandedState>({})

  // Determine if we're using controlled or uncontrolled state for filters
  const hasControlledFilters = controlledColumnFilters !== undefined && controlledOnColumnFiltersChange !== undefined
  const columnFilters = hasControlledFilters ? controlledColumnFilters : internalColumnFilters
  const setColumnFilters = React.useCallback((updaterOrValue: ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState)) => {
    const setter = hasControlledFilters ? controlledOnColumnFiltersChange : setInternalColumnFilters
    if (typeof updaterOrValue === 'function') {
      setter(updaterOrValue(columnFilters))
    } else {
      setter(updaterOrValue)
    }
  }, [hasControlledFilters, controlledOnColumnFiltersChange, columnFilters])

  // Determine if we're using controlled or uncontrolled state for visibility
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
      <div className="border rounded-md">
        <div className="relative">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => {
                  const headers = headerGroup.headers
                  return (
                  <TableRow key={headerGroup.id}>
                    {headers.map((header, hIdx) => {
                      const isLastTwo = hIdx >= headers.length - 2
                      return (
                      <TableHead 
                        key={header.id} 
                        colSpan={header.colSpan}
                        style={{
                          position: 'sticky',
                          top: 0,
                          right: isLastTwo && hIdx === headers.length - 1 ? 0 : undefined,
                          zIndex: isLastTwo ? 31 : 30,
                          backgroundColor: 'hsl(var(--background))',
                          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                      )
                    })}
                  </TableRow>
                  )
                })}
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
                  table.getRowModel().rows.map((row, index) => {
                    const isEven = index % 2 === 0
                    const rowBg = isEven ? 'hsl(var(--background))' : 'hsl(var(--muted) / 0.2)'
                    const visibleCells = row.getVisibleCells()
                    return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        data-state={row.getIsSelected() && "selected"}
                        className={`${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""} ${isEven ? "bg-background" : "bg-muted/20"}`}
                        onClick={() => onRowClick?.(row.original)}
                      >
                        {visibleCells.map((cell, cellIndex) => {
                          const isLastTwo = cellIndex >= visibleCells.length - 2
                          return (
                          <TableCell
                            key={cell.id}
                            style={isLastTwo ? {
                              position: 'sticky',
                              right: cellIndex === visibleCells.length - 1 ? 0 : undefined,
                              backgroundColor: rowBg,
                              zIndex: 1,
                            } : undefined}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                          )
                        })}
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
                  )})
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
        </div>
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

// Virtual scrolling implementation
function VirtualDataTableImpl<TData, TValue>({
  columns,
  fetchPage,
  pageSize = 50,
  maxHeight,
  filterConfig,
  toolbar,
  enableRowSelection = false,
  onRowClick,
  emptyMessage = "No results.",
  getRowId,
  columnVisibility,
  onColumnVisibilityChange,
  searchPlaceholder = "Search...",
  mounted,
}: VirtualDataTableProps<TData, TValue> & { mounted: boolean }) {
  const [rows, setRows] = React.useState<TData[]>([])
  const [page, setPage] = React.useState(0)
  const [hasMore, setHasMore] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [clientColumnVisibility, setClientColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [totalCount, setTotalCount] = React.useState(0)
  
  const debouncedSearch = useDebounce(search, 300)
  
  // Refs for window virtualization
  const bodyStartRef = React.useRef<HTMLDivElement>(null)
  const headerInnerRef = React.useRef<HTMLDivElement>(null)
  const bodyScrollRef = React.useRef<HTMLDivElement>(null)
  const [scrollMargin, setScrollMargin] = React.useState(0)

  // Determine if we're using controlled or uncontrolled state for visibility
  const hasControlledVisibility = columnVisibility !== undefined && onColumnVisibilityChange !== undefined
  const visibilityState = hasControlledVisibility ? columnVisibility : clientColumnVisibility
  const onVisibilityChange = hasControlledVisibility ? onColumnVisibilityChange : setClientColumnVisibility

  // Reset logic - when search, filters, or sorting changes, reset to page 0
  React.useEffect(() => {
    setRows([])
    setPage(0)
    setHasMore(true)
  }, [debouncedSearch, columnFilters, sorting])

  // Fetch logic
  React.useEffect(() => {
    if (!mounted) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const params: any = {
          limit: pageSize,
          offset: page * pageSize,
          search: debouncedSearch || undefined,
        }

        // Add sorting
        if (sorting.length > 0) {
          params.sortBy = sorting[0].id
          params.order = sorting[0].desc ? 'desc' : 'asc'
        }

        // Add filters
        columnFilters.forEach(filter => {
          if (filter.value && Array.isArray(filter.value) && filter.value.length > 0) {
            params[filter.id] = filter.value.join(',')
          }
        })

        const response = await fetchPage(params)
        const newData = response.employees || response.data || []
        const total = response.total || 0

        setTotalCount(total)

        if (page === 0) {
          setRows(newData)
        } else {
          setRows(prev => [...prev, ...newData])
        }

        setHasMore(newData.length === pageSize && (page + 1) * pageSize < total)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        if (page === 0) {
          setRows([])
        }
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [page, debouncedSearch, columnFilters, sorting, pageSize, fetchPage, mounted])

  // Measure scroll margin for window virtualizer
  React.useLayoutEffect(() => {
    if (bodyStartRef.current) {
      const rect = bodyStartRef.current.getBoundingClientRect()
      setScrollMargin(rect.top + window.scrollY)
    }
  }, [rows.length])

  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 48,
    overscan: 10,
    scrollMargin,
  })

  const virtualItems = virtualizer.getVirtualItems()

  // Scroll detection - load more when near the end
  React.useEffect(() => {
    if (virtualItems.length === 0) return

    const lastItem = virtualItems[virtualItems.length - 1]
    if (!lastItem) return

    // If we're within 10 items of the end, load more
    if (lastItem.index >= rows.length - 10 && hasMore && !loading && rows.length < totalCount) {
      setPage(prev => prev + 1)
    }
  }, [virtualItems, rows.length, hasMore, loading, totalCount])

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      columnFilters,
      columnVisibility: visibilityState,
      rowSelection,
      sorting,
    },
    enableRowSelection,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: onVisibilityChange,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualFiltering: true,
    ...(getRowId && { getRowId }),
  })

  // Get column widths from table
  const headerGroups = table.getHeaderGroups()
  const visibleColumns = headerGroups[0]?.headers || []

  // Sync body horizontal scroll → header translation (no scrollbar on header)
  // Must be declared before any early returns to satisfy Rules of Hooks
  const handleBodyScroll = React.useCallback(() => {
    if (bodyScrollRef.current && headerInnerRef.current) {
      headerInnerRef.current.style.transform = `translateX(-${bodyScrollRef.current.scrollLeft}px)`
    }
  }, [])

  if (!mounted) {
    return (
      <div className="flex flex-col">
        <div className="overflow-hidden border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loading...</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Build column template: fixed-size columns use px, last column stretches with 1fr
  const colTemplate = visibleColumns.map((header, i) => {
    const size = header.column.getSize()
    if (i === visibleColumns.length - 1) return `minmax(${size || 100}px, 1fr)`
    return size ? `${size}px` : 'minmax(100px, 1fr)'
  }).join(' ')

  return (
    <div className="flex flex-col">
      {toolbar && toolbar(table, search, setSearch, columnFilters, setColumnFilters)}

      {/* Sticky header — lives OUTSIDE overflow container so position:sticky works */}
      <div
        style={{
          position: 'sticky',
          top: 64,
          zIndex: 20,
          backgroundColor: 'hsl(var(--background))',
          borderTop: '1px solid hsl(var(--border))',
          borderLeft: '1px solid hsl(var(--border))',
          borderRight: '1px solid hsl(var(--border))',
          borderBottom: '1px solid hsl(var(--border))',
          borderTopLeftRadius: '0.375rem',
          borderTopRightRadius: '0.375rem',
          overflow: 'hidden', // clip the translateX'd inner div
        }}
      >
        {/* Inner div that gets translateX'd to mirror body scroll — no scrollbar */}
        <div ref={headerInnerRef} style={{ willChange: 'transform' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: colTemplate,
              minWidth: '100%',
            }}
          >
            {visibleColumns.map((header) => (
              <div
                key={header.id}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  color: 'hsl(var(--foreground))',
                  whiteSpace: 'nowrap',
                }}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body — single overflow-x-auto = single scrollbar */}
      <div
        ref={bodyScrollRef}
        className="overflow-x-auto border border-t-0 rounded-b-md"
        onScroll={handleBodyScroll}
      >
        <div ref={bodyStartRef} style={{ minWidth: '100%' }}>
          {rows.length === 0 && !loading ? (
            <div className="h-24 flex items-center justify-center text-center text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div
              style={{
                position: 'relative',
                height: `${virtualizer.getTotalSize()}px`,
                minWidth: '100%',
              }}
            >
              {virtualItems.map((virtualRow) => {
                const row = table.getRowModel().rows[virtualRow.index]
                if (!row) return null

                return (
                  <div
                    key={row.id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                      display: 'grid',
                      gridTemplateColumns: colTemplate,
                      borderBottom: '1px solid hsl(var(--border))',
                      backgroundColor: virtualRow.index % 2 === 0 ? 'hsl(var(--background))' : 'hsl(var(--muted) / 0.2)',
                      cursor: onRowClick ? 'pointer' : 'default',
                    }}
                    onClick={() => onRowClick?.(row.original)}
                    onMouseEnter={(e) => {
                      if (onRowClick) e.currentTarget.style.backgroundColor = 'hsl(var(--muted) / 0.5)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = virtualRow.index % 2 === 0 ? 'hsl(var(--background))' : 'hsl(var(--muted) / 0.2)'
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div
                        key={cell.id}
                        style={{
                          padding: '0.5rem 0.75rem',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          minWidth: 0,
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="py-4 text-center text-sm text-muted-foreground border-t">
            Loading more...
          </div>
        )}

        {/* Total count message */}
        {!hasMore && rows.length > 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground border-t">
            Showing all {totalCount} results
          </div>
        )}
      </div>
    </div>
  )
}