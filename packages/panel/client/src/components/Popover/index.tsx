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
      <Primitive.Positioner sideOffset={4}>
        <Primitive.Popup
          className={cn(
            "p-4 rounded-2xl bg-ui-900 shadow-popup outline-none transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  )
}
