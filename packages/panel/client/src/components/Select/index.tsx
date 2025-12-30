import { Select as Primitive } from "@base-ui/react/select"
import { IconChevronDown } from "@tabler/icons-react"
import { cn } from "../../lib/cn"

interface SelectProps<Value, Multiple extends boolean | undefined>
  extends Primitive.Root.Props<Value, Multiple> {
  label?: string
}

export const Select = <Value, Multiple extends boolean | undefined>({
  label,
  ...props
}: SelectProps<Value, Multiple>) => {
  return (
    <Primitive.Root {...props}>
      {label && <div className="block mb-1">{label}</div>}
      {props.children}
    </Primitive.Root>
  )
}

interface SelectTriggerProps extends Primitive.Trigger.Props {
  placeholder?: string
}

export const SelectTrigger = ({
  placeholder,
  children,
  className,
  ...props
}: SelectTriggerProps) => {
  return (
    <Primitive.Trigger
      className={cn(
        "w-full px-4 py-2 border border-ui-700 hover:bg-ui-800 rounded-lg flex items-center justify-between",
        className,
      )}
      {...props}
    >
      <Primitive.Value
        render={(p, s) => <span>{s.value ? s.value : placeholder}</span>}
      />
      <Primitive.Icon>
        <IconChevronDown />
      </Primitive.Icon>
    </Primitive.Trigger>
  )
}

export const SelectContent = (props: Primitive.List.Props) => {
  return (
    <Primitive.Portal>
      <Primitive.Positioner
        alignItemWithTrigger={false}
        className="min-w-(--anchor-width)"
      >
        <Primitive.Popup className="p-1 border border-ui-700 rounded-lg shadow-lg bg-ui-900 max-h-72 overflow-y-auto">
          <Primitive.List {...props} className={cn("w-full", props.className)} />
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  )
}

export const SelectItem = ({ children, className, ...props }: Primitive.Item.Props) => {
  return (
    <Primitive.Item
      {...props}
      className={cn("px-2 py-1 flex items-center gap-2 rounded-sm hover:bg-ui-800", className)}
    >
      <Primitive.ItemIndicator
        render={(p) => <span className="size-2 inline-block rounded-full bg-emerald" />}
      />
      {children}
    </Primitive.Item>
  )
}
