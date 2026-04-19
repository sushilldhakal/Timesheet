import { useMemo } from "react"
import type { Block, Resource, FlatRow } from "@/components/scheduling/core/types-scheduler"

/** Primary role in category ∪ anyone with a shift in this category. */
export function employeesForCategory(
  catId: string,
  employees: Resource[],
  shifts: Block[] | undefined,
): Resource[] {
  const byId = new Map<string, Resource>()
  for (const e of employees) {
    if (e.categoryId === catId) byId.set(e.id, e)
  }
  if (shifts) {
    for (const s of shifts) {
      if (s.categoryId !== catId || !s.employeeId) continue
      if (byId.has(s.employeeId)) continue
      const e = employees.find((x) => x.id === s.employeeId)
      if (e) {
        byId.set(e.id, e)
        continue
      }
      // Roster miss: still surface shift assignee so counts / rows match the grid.
      byId.set(s.employeeId, {
        id: s.employeeId,
        name: s.employee?.trim() || s.employeeId,
        kind: "employee",
        categoryId: catId,
        colorIdx: 0,
      })
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Computes the flat virtualizer row array.
 *
 * mode="individual" — category header + one row per employee (tree model)
 * mode="category"  — category header rows only (classic stacked view)
 * mode="flat"      — employee rows only, no category headers (EPG/timeline mode)
 */
export function useFlatRows(
  categories: Resource[],
  employees: Resource[],
  collapsed: Set<string>,
  mode: "category" | "individual" | "flat" = "individual",
  shifts?: Block[],
): FlatRow[] {
  return useMemo(() => {
    const rows: FlatRow[] = []
    for (const cat of categories) {
      // flat mode: skip category header entirely — one row per employee only
      if (mode === "flat") {
        const catEmployees = employeesForCategory(cat.id, employees, shifts)
        for (const emp of catEmployees) {
          rows.push({
            key: `emp:${cat.id}:${emp.id}`,
            kind: "employee",
            category: cat,
            employee: emp,
            depth: 0,
          })
        }
        continue
      }
      rows.push({
        key: `cat:${cat.id}`,
        kind: "category",
        category: cat,
        depth: 0,
      })
      if (mode === "individual" && !collapsed.has(cat.id)) {
        const catEmployees = employeesForCategory(cat.id, employees, shifts)
        for (const emp of catEmployees) {
          rows.push({
            key: `emp:${cat.id}:${emp.id}`,
            kind: "employee",
            category: cat,
            employee: emp,
            depth: 1,
          })
        }
      }
    }
    return rows
  }, [categories, employees, collapsed, mode, shifts])
}

/**
 * Given a flat row array and the virtualizer's measured item sizes,
 * builds a map from categoryId → top pixel offset of first employee row in that category.
 * Used by dragEngine.getCategoryAtY and getCategoryAtY in GridView.
 */
export function buildFlatRowTops(
  flatRows: FlatRow[],
  getItemOffset: (index: number) => number,
): Record<string, number> {
  const tops: Record<string, number> = {}
  flatRows.forEach((row, i) => {
    if (row.kind === "employee" && row.employee) {
      // Key by employeeId for per-employee targeting
      tops[`emp:${row.employee.id}`] = getItemOffset(i)
    } else if (row.kind === "category") {
      tops[`cat:${row.category.id}`] = getItemOffset(i)
    }
  })
  return tops
}
