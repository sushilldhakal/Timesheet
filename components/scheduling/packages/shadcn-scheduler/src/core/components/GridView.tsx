/**
 * GridView — re-exported from @shadcn-scheduler/grid-engine.
 *
 * packages/shadcn-scheduler is now a *consumer* of grid-engine rather than a
 * parallel implementation. This file exists only for backward-compatibility of
 * any internal imports that still reference "./GridView".
 */
export { GridView } from '@shadcn-scheduler/grid-engine'

// Back-compat types used by Sidebar and other internal components.
// These are state shapes (not exported by grid-engine) for internal UI panels.
export type StaffPanelState = {
  categoryId: string
  employeeId?: string | null
  anchorRect?: DOMRect
  x?: number
  y?: number
}

export type AddPromptState = {
  date: Date
  categoryId?: string | null
  empId?: string | null
  x: number
  y: number
}
