"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import type { VisibilityState } from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ServerDataTable } from "@/components/ui/data-table"
import { ExternalLink } from "lucide-react"

export type FlagIssueType = "no_image" | "no_location" | "no_image_no_location"

export interface FlagRow {
  id: string
  employeeId: string
  date: string
  pin: string
  name: string
  type: string
  typeLabel: string
  hasImage: boolean
  hasLocation: boolean
  issueType: FlagIssueType
}

const FILTER_OPTIONS: { value: "" | FlagIssueType; label: string }[] = [
  { value: "", label: "All flagged" },
  { value: "no_image", label: "No image" },
  { value: "no_location", label: "No location" },
  { value: "no_image_no_location", label: "No image & no location" },
]

function getColumns(): ColumnDef<FlagRow>[] {
  return [
    {
      id: "date",
      accessorKey: "date",
      header: "Date",
      enableHiding: true,
    },
    {
      id: "name",
      accessorKey: "name",
      header: "Employee",
      enableHiding: true,
      cell: ({ row }) => {
        const { name, employeeId } = row.original
        if (employeeId) {
          return (
            <Link
              href={`/dashboard/employees/${employeeId}`}
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {name || row.original.pin}
              <ExternalLink className="size-3 shrink-0" />
            </Link>
          )
        }
        return name || row.original.pin
      },
    },
    {
      id: "pin",
      accessorKey: "pin",
      header: "PIN",
      enableHiding: true,
    },
    {
      id: "typeLabel",
      accessorKey: "typeLabel",
      header: "Punch type",
      enableHiding: true,
    },
    {
      id: "hasImage",
      accessorKey: "hasImage",
      header: "Image",
      enableHiding: true,
      cell: ({ row }) => (row.original.hasImage ? "Yes" : "No"),
    },
    {
      id: "hasLocation",
      accessorKey: "hasLocation",
      header: "Location",
      enableHiding: true,
      cell: ({ row }) => (row.original.hasLocation ? "Yes" : "No"),
    },
    {
      id: "issueType",
      accessorKey: "issueType",
      header: "Issue",
      enableHiding: true,
      cell: ({ row }) => {
        const t = row.original.issueType
        if (t === "no_image") return "No image"
        if (t === "no_location") return "No location"
        if (t === "no_image_no_location") return "No image & no location"
        return t
      },
    },
  ]
}

export default function FlagPage() {
  const [filter, setFilter] = useState<"" | FlagIssueType>("")
  const [items, setItems] = useState<FlagRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState<string | null>("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [searchValue, setSearchValue] = useState("")

  const columns = getColumns()

  const fetchFlags = useCallback(async () => {
    setLoading(true)
    setError(null)
    const offset = pageIndex * pageSize
    const params = new URLSearchParams()
    params.set("limit", String(pageSize))
    params.set("offset", String(offset))
    if (filter) params.set("filter", filter)
    try {
      const res = await fetch(`/api/flags?${params.toString()}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Failed to load flags")
      }
      const data = await res.json()
      setItems(data.items ?? [])
      setTotalCount(data.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load flags")
      setItems([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [filter, pageIndex, pageSize, sortBy, sortOrder])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Flagged punches (last 30 days)</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filter by issue</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <label className="text-muted-foreground block text-xs font-medium">Issue type</label>
            <Select
              value={filter || "all"}
              onValueChange={(v) => {
                setFilter((v === "all" ? "" : v) as "" | FlagIssueType)
                setPageIndex(0)
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All flagged" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "all"} value={opt.value || "all"}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 pt-4">
          {error && (
            <p className="text-destructive px-4 py-2 text-sm">{error}</p>
          )}
          <ServerDataTable<FlagRow, unknown>
            columns={columns}
            data={items}
            totalCount={totalCount}
            loading={loading}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            showSearch={false}
            pageIndex={pageIndex}
            pageSize={pageSize}
            onPageChange={setPageIndex}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPageIndex(0)
            }}
            pageSizeOptions={[20, 50, 100]}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(columnId, order) => {
              setSortBy(columnId)
              setSortOrder(order)
              setPageIndex(0)
            }}
            sortableColumnIds={["date", "name", "pin", "typeLabel", "hasImage", "hasLocation", "issueType"]}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={(updater) =>
              setColumnVisibility((prev) => (typeof updater === "function" ? updater(prev) : updater))
            }
            getRowId={(row) => row.id}
            emptyMessage="No flagged punches in the last 30 days."
          />
        </CardContent>
      </Card>
    </div>
  )
}
