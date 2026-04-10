import React, { useMemo } from "react"
import { MultiSelect } from "@/components/ui/MultiSelect"
import { useSchedulerContext } from "@/components/scheduling/shell/SchedulerProvider"

interface UserSelectProps {
  selEmps: Set<string>
  onToggle: (empId: string) => void
  onAll: () => void
  onNone: () => void
}

export function UserSelect({ selEmps, onToggle }: UserSelectProps): React.ReactElement {
  const { categories, employees, getColor, labels } = useSchedulerContext()

  const options = useMemo(() => {
    return employees.map((emp) => {
      return {
        label: emp.name,
        value: emp.id,
        id: emp.id,
      }
    })
  }, [employees])

  const handleValueChange = (values: string[]): void => {
    const newSet = new Set(values)
    employees.forEach((emp) => {
      const shouldBeSelected = newSet.has(emp.id)
      const isCurrentlySelected = selEmps.has(emp.id)
      if (shouldBeSelected !== isCurrentlySelected) onToggle(emp.id)
    })
  }

  return (
    <MultiSelect
      options={options}
      defaultValue={Array.from(selEmps)}
      onValueChange={handleValueChange}
      placeholder={labels.selectStaff || "All employees"}
      searchable
      avatarView
      maxCount={5}
      autoSize
      minWidth="220px"
      maxWidth="260px"
      className="flex-none"
    />
  )
}

