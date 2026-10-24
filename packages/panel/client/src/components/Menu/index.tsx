import { cn, cva } from "@/lib/cn"
import { Menu as Primitive } from "@base-ui/react/menu"
import { IconCheck, IconChevronRight } from "@tabler/icons-react"

export const Menu = Primitive.Root

interface MenuTriggerProps extends Primitive.Trigger.Props {}

export const MenuTrigger = ({ className, children, ...props }: MenuTriggerProps) => {
  return (
    <Primitive.Trigger className={cn("", className)} {...props}>
      {children}
    </Primitive.Trigger>
  )
}

interface MenuContentProps extends Primitive.Popup.Props {}

export const MenuContent = ({ className, children, ...props }: MenuContentProps) => {
  return (
    <Primitive.Portal>
      <Primitive.Positioner sideOffset={2}>
        <Primitive.Popup
          {...props}
          className={cn("bg-ui-900 border border-ui-700 rounded-lg p-1", className)}
        >
          {children}
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  )
}

export const MenuSubmenu = Primitive.SubmenuRoot

interface MenuSubmenuTriggerProps extends Primitive.SubmenuTrigger.Props {}

export const MenuSubmenuTrigger = ({
  className,
  children,
  ...props
}: MenuSubmenuTriggerProps) => {
  return (
    <Primitive.SubmenuTrigger
      className={cn(
        "flex gap-2 items-center px-2 py-1 rounded-sm cursor-pointer hover:bg-ui-800 data-popup-open:bg-ui-800",
        className,
      )}
      {...props}
    >
      {children}
      <IconChevronRight className="ml-auto" />
    </Primitive.SubmenuTrigger>
  )
}

interface MenuItemProps extends Primitive.Item.Props {
  variant?: "default" | "destructive"
}

export const MenuItem = ({
  className,
  children,
  variant = "default",
  ...props
}: MenuItemProps) => {
  const itemStyles = cva({
    base: ["flex gap-2 items-center px-2 py-1 rounded-sm cursor-pointer", className],
    variants: {
      variant: {
        default: "hover:bg-ui-800",
        destructive: "text-red-500 hover:bg-red-900",
      },
    },
  })

  return (
    <Primitive.Item {...props} className={itemStyles({ variant })}>
      {children}
    </Primitive.Item>
  )
}

interface MenuCheckboxItemProps extends Primitive.CheckboxItem.Props {}

export const MenuCheckboxItem = ({
  className,
  children,
  ...props
}: MenuCheckboxItemProps) => {
  return (
    <Primitive.CheckboxItem
      {...props}
      className={cn(
        "flex gap-2 items-center px-2 py-1 rounded-sm cursor-pointer hover:bg-ui-800",
        className,
      )}
    >
      <span className="size-6 p-0.5 flex items-center justify-center bg-ui-800 border border-ui-700 rounded-lg shrink-0">
        <Primitive.CheckboxItemIndicator render={<IconCheck />} />
      </span>
      {children}
    </Primitive.CheckboxItem>
  )
}

export const MenuSeparator = (props: Primitive.Separator.Props) => {
  return <Primitive.Separator className="h-px bg-ui-700 my-1" {...props} />
}
