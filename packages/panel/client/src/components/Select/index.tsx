import { Select as Primitive } from "@base-ui/react/select"
import { IconChevronDown } from "@tabler/icons-react"
import { cn } from "../../lib/cn"

interface SelectProps<Value, Multiple extends boolean | undefined>
  extends Primitive.Root.Props<Value, Multiple> {
  label?: string
  placeholder?: string
}

export const Select = <Value, Multiple extends boolean | undefined>({
  placeholder,
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

export const SelectTrigger = ({
  children,
  className,
  ...props
}: Primitive.Trigger.Props) => {
  return (
    <Primitive.Trigger
      className={cn(
        "w-full px-4 py-2 border border-ui-700 rounded-lg flex items-center justify-between",
        className,
      )}
      {...props}
    >
      <Primitive.Value />
      <Primitive.Icon>
        <IconChevronDown />
      </Primitive.Icon>
    </Primitive.Trigger>
  )
}

export const SelectContent = (props: Primitive.List.Props) => {
  return (
    <Primitive.Portal>
      <Primitive.Positioner>
        <Primitive.Popup>
          <Primitive.List
            {...props}
            className={cn("bg-ui-900 border border-ui-700 rounded-lg", props.className)}
          />
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  )
}

export const SelectItem = ({ children, className, ...props }: Primitive.Item.Props) => {
  return (
    <Primitive.Item {...props}>
      {children}
      <Primitive.ItemIndicator className="size-2 rounded-full bg-red-500" />
    </Primitive.Item>
  )
}
