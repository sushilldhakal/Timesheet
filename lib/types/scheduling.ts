// Scheduling view types
export type KViewBase = 'day' | 'week' | 'month' | 'year'
export type KView = KViewBase | `list${KViewBase}`
