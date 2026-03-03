"use client"

import { type Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/components/ui/data-table/data-table-view-options"
import { DataTableFacetedFilter } from "@/components/ui/data-table/data-table-faceted-filter"

export interface FilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface FilterConfig {
  columnId: string
  title: string
  options: FilterOption[]
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchKey?: string
  searchPlaceholder?: string
  filterConfig?: FilterConfig[]
  actions?: React.ReactNode
  // Server-side search props
  searchValue?: string
  onSearchChange?: (value: string) => void
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  searchPlaceholder = "Search...",
  filterConfig = [],
  actions,
  searchValue,
  onSearchChange,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  // Use server-side search if provided, otherwise use client-side filtering
  const useServerSearch = searchValue !== undefined && onSearchChange !== undefined

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center gap-2">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={
              useServerSearch
                ? searchValue
                : ((table.getColumn(searchKey)?.getFilterValue() as string) ?? "")
            }
            onChange={(event) => {
              if (useServerSearch) {
                onSearchChange(event.target.value)
              } else {
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
            }}
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {filterConfig.map((filter) => {
          const column = table.getColumn(filter.columnId)
          if (!column) return null
          
          return (
            <DataTableFacetedFilter
              key={filter.columnId}
              column={column}
              title={filter.title}
              options={filter.options}
            />
          )
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.resetColumnFilters()}
          >
            Reset
            <X />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
        {actions}
      </div>
    </div>
  )
}