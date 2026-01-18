import { cn } from "@/lib/cn"
import { Popover as Primitive } from "@base-ui/react/popover"

export const Popover = Primitive.Root

export const PopoverTrigger = Primitive.Trigger

interface PopoverContentProps extends Primitive.Popup.Props {}

export const PopoverContent = ({
  children,
  className,
  ...props
}: PopoverContentProps) => {
  return (
    <Primitive.Portal>
      <Primitive.Positioner alignOffset={2} sideOffset={2}>
        <Primitive.Popup
          className={cn("p-4 rounded-lg bg-ui-900 border border-ui-700", className)}
          {...props}
        >
          {children}
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  )
}
