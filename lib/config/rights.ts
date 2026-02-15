/**
 * User privilege rights
 * Users can have all or some of these rights
 */
export const RIGHTS = {
  ADD_STAFF: 'add_staff',
  EDIT_STAFF: 'edit_staff',
  DELETE_STAFF: 'delete_staff',
  GET_TIMESHEET: 'get_timesheet',
} as const

export type Right = (typeof RIGHTS)[keyof typeof RIGHTS]

export const RIGHTS_LIST: Right[] = Object.values(RIGHTS)

export const RIGHT_LABELS: Record<Right, string> = {
  [RIGHTS.ADD_STAFF]: 'Add Staff',
  [RIGHTS.EDIT_STAFF]: 'Edit Staff',
  [RIGHTS.DELETE_STAFF]: 'Delete Staff',
  [RIGHTS.GET_TIMESHEET]: 'Get Timesheet',
}

export function isValidRight(value: string): value is Right {
  return RIGHTS_LIST.includes(value as Right)
}
