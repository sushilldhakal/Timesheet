"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ChevronDownIcon, XIcon, CheckIcon } from "lucide-react"

type ComboboxContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  value: string
  setValue: (value: string) => void
  inputValue: string
  setInputValue: (v: string) => void
}

const ComboboxContext = React.createContext<ComboboxContextValue | null>(null)

function useComboboxContext() {
  const ctx = React.useContext(ComboboxContext)
  if (!ctx) return null
  return ctx
}

function Combobox({
  children,
  value: controlledValue,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "")
  const [inputValue, setInputValue] = React.useState("")
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : uncontrolledValue

  const setValue = React.useCallback(
    (v: string) => {
      if (!isControlled) setUncontrolledValue(v)
      onValueChange?.(v)
    },
    [isControlled, onValueChange]
  )

  const ctx: ComboboxContextValue = {
    open,
    setOpen,
    value,
    setValue,
    inputValue,
    setInputValue,
  }

  return (
    <ComboboxContext.Provider value={ctx}>
      <PopoverPrimitive.Root
        open={open}
        onOpenChange={setOpen}
        data-slot="combobox"
        {...props}
      >
        {children}
      </PopoverPrimitive.Root>
    </ComboboxContext.Provider>
  )
}

function ComboboxValue({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const ctx = useComboboxContext()
  if (!ctx) return <span data-slot="combobox-value" {...props} />
  return (
    <span
      data-slot="combobox-value"
      className={cn(className)}
      {...props}
    >
      {ctx.value}
    </span>
  )
}

function ComboboxTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return (
    <PopoverPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="text-muted-foreground size-4 pointer-events-none" />
    </PopoverPrimitive.Trigger>
  )
}

function ComboboxClear({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const ctx = useComboboxContext()
  return (
    <InputGroupButton
      type="button"
      variant="ghost"
      size="icon-xs"
      data-slot="combobox-clear"
      className={cn(className)}
      onClick={() => ctx?.setValue("")}
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </InputGroupButton>
  )
}

function ComboboxInput({
  className,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: React.ComponentProps<"input"> & {
  showTrigger?: boolean
  showClear?: boolean
}) {
  const ctx = useComboboxContext()
  return (
    <InputGroup className={cn("w-auto", className)}>
      <PopoverPrimitive.Anchor asChild>
        <InputGroupInput
          disabled={disabled}
          value={ctx?.inputValue ?? ctx?.value ?? ""}
          onChange={(e) => ctx?.setInputValue(e.target.value)}
          onFocus={() => ctx?.setOpen(true)}
          {...props}
        />
      </PopoverPrimitive.Anchor>
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton size="icon-xs" variant="ghost" asChild disabled={disabled}>
            <ComboboxTrigger />
          </InputGroupButton>
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
    </InputGroup>
  )
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
  align?: "start" | "center" | "end"
  alignOffset?: number
}) {
  const ctx = useComboboxContext()
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="combobox-content"
        side={side}
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "bg-popover text-popover-foreground z-50 max-h-[var(--radix-popover-content-available-height)] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-lg border shadow-md outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      >
        <CommandPrimitive
          className="flex flex-col overflow-hidden"
          value={ctx?.value}
          onValueChange={(v) => ctx?.setInputValue(v)}
          filter={(value, search) => (value?.toLowerCase().includes(search?.toLowerCase() ?? "") ? 1 : 0)}
        >
          {children}
        </CommandPrimitive>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

function ComboboxList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "no-scrollbar max-h-72 scroll-py-1 p-1 overflow-y-auto overscroll-contain",
        className
      )}
      {...props}
    />
  )
}

function ComboboxItem({
  className,
  children,
  value: itemValue,
  onSelect: onSelectProp,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  const ctx = useComboboxContext()
  return (
    <CommandPrimitive.Item
      data-slot="combobox-item"
      value={itemValue}
      className={cn(
        "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground gap-2 rounded-sm py-1.5 pe-8 ps-2 text-sm relative flex w-full cursor-default items-center outline-none select-none [&_svg]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className
      )}
      onSelect={(value) => {
        ctx?.setValue(value ?? itemValue ?? "")
        ctx?.setInputValue("")
        ctx?.setOpen(false)
        onSelectProp?.(value)
      }}
      {...props}
    >
      {children}
      <span className="pointer-events-none absolute end-2 flex size-4 items-center justify-center">
        {ctx?.value === (itemValue ?? "") ? <CheckIcon className="pointer-events-none" /> : null}
      </span>
    </CommandPrimitive.Item>
  )
}

function ComboboxGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  )
}

function ComboboxLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="combobox-label"
      className={cn("text-muted-foreground px-2 py-1.5 text-xs", className)}
      {...props}
    />
  )
}

function ComboboxCollection({ ...props }: React.ComponentProps<"div">) {
  return <div data-slot="combobox-collection" {...props} />
}

function ComboboxEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "text-muted-foreground py-2 text-center text-sm",
        className
      )}
      {...props}
    />
  )
}

function ComboboxSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  )
}

function ComboboxChips({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border bg-transparent px-2.5 py-1.5 text-sm",
        className
      )}
      {...props}
    />
  )
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: React.ComponentProps<"div"> & { showRemove?: boolean }) {
  return (
    <div
      data-slot="combobox-chip"
      className={cn(
        "bg-muted text-foreground flex h-6 w-fit items-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap",
        className
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <Button variant="ghost" size="icon-xs" className="-ms-1 opacity-50 hover:opacity-100">
          <XIcon className="pointer-events-none" />
        </Button>
      )}
    </div>
  )
}

function ComboboxChipsInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="combobox-chip-input"
      className={cn("min-w-16 flex-1 outline-none bg-transparent", className)}
      {...props}
    />
  )
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}
