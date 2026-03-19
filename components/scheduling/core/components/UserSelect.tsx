import React, { useMemo } from "react"
import { Users } from "lucide-react"
import { MultiSelect, type MultiSelectGroup } from "../../../ui/MultiSelect"
import { useSchedulerContext } from "../context"

interface UserSelectProps {
  selEmps: Set<string>
  onToggle: (empId: string) => void
  onAll: () => void
  onNone: () => void
}

interface OptionMeta {
  avatar: string
  categoryName: string
  bg: string
  text: string
}

export function UserSelect({ selEmps, onToggle }: UserSelectProps): React.ReactElement {
  const { categories, employees, getColor, labels } = useSchedulerContext()

  const options: MultiSelectGroup[] = useMemo(
    () =>
      categories.map((cat) => {
        const c = getColor(cat.colorIdx)
        return {
          heading: cat.name,
          options: employees
            .filter((e) => e.categoryId === cat.id)
            .map((emp) => ({
              label: emp.name,
              value: emp.id,
              meta: {
                avatar: emp.avatar,
                categoryName: cat.name,
                bg: c.light,
                text: c.text,
              } satisfies OptionMeta,
              icon: () => (
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: c.light, color: c.text }}
                >
                  {emp.avatar}
                </div>
              ),
            })),
        }
      }),
    [categories, employees, getColor]
  )

  const selectedValues: string[] = Array.from(selEmps)

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
      onValueChange={handleValueChange}
      value={selectedValues}
      placeholder={
        <span className="flex items-center gap-2 text-muted-foreground">
          <Users size={14} className="shrink-0 opacity-70" />
          {labels.selectStaff}
        </span>
      }
      searchable={true}
      hideSelectAll={false}
      className="max-w-full sm:w-48"
      avatarView={true}
    />
  )
}
