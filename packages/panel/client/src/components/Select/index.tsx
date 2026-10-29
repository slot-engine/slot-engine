import { Select as Primitive } from "@base-ui/react/select"
import { IconChevronDown } from "@tabler/icons-react"
import { cn } from "../../lib/cn"

interface SelectProps<Value, Multiple extends boolean | undefined>
  extends Primitive.Root.Props<Value, Multiple> {
  label?: string
  className?: string
}

export const Select = <Value, Multiple extends boolean | undefined>({
  label,
  className,
  ...props
}: SelectProps<Value, Multiple>) => {
  return (
    <Primitive.Root {...props}>
      <div className={className}>
        {label && <div className="block mb-1.5 text-ui-100">{label}</div>}
        {props.children}
      </div>
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
        "w-full h-10 pl-3 pr-2 flex gap-2 items-center justify-between rounded-lg bg-ui-800 cursor-pointer transition-colors duration-150 hover:bg-ui-700 data-popup-open:bg-ui-700",
        className,
      )}
      {...props}
    >
      <Primitive.Value className="truncate" />
      <Primitive.Icon className="shrink-0 text-ui-500">
        <IconChevronDown size={20} stroke={1.5} aria-hidden />
      </Primitive.Icon>
    </Primitive.Trigger>
  )
}

export const SelectContent = (props: Primitive.List.Props) => {
  return (
    <Primitive.Portal>
      <Primitive.Positioner
        alignItemWithTrigger={false}
        sideOffset={4}
        className="min-w-(--anchor-width)"
      >
        <Primitive.Popup className="p-1 rounded-xl bg-ui-900 shadow-popup max-h-72 overflow-y-auto scrollbar-thin outline-none transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
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
      className={cn(
        "h-9 px-2 grid grid-cols-[0.5rem_minmax(0,1fr)] items-center gap-2 rounded-lg cursor-pointer select-none text-ui-100 outline-none transition-colors duration-150 data-highlighted:bg-ui-800 data-highlighted:text-ui-50 data-selected:text-ui-50",
        className,
      )}
    >
      <Primitive.ItemIndicator
        render={() => <span className="size-2 rounded-full bg-accent-500" />}
      />
      <span className="col-start-2 truncate">{children}</span>
    </Primitive.Item>
  )
}
