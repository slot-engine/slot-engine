import { cn, cva } from "@/lib/cn"
import { Menu as Primitive } from "@base-ui/react/menu"
import { IconCheck, IconChevronRight } from "@tabler/icons-react"

export const menuPopupStyles =
  "min-w-48 p-1 rounded-xl bg-ui-900 shadow-popup outline-none transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0"

export const menuItemStyles = cva({
  base: "flex h-9 gap-2 items-center px-2 rounded-lg cursor-pointer select-none outline-none transition-colors duration-150",
  variants: {
    variant: {
      default: "text-ui-100 data-highlighted:bg-ui-800 data-highlighted:text-ui-50",
      destructive: "text-danger-500 data-highlighted:bg-danger-950",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

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
      <Primitive.Positioner sideOffset={4}>
        <Primitive.Popup {...props} className={cn(menuPopupStyles, className)}>
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
        menuItemStyles(),
        "data-popup-open:bg-ui-800 data-popup-open:text-ui-50",
        className,
      )}
      {...props}
    >
      {children}
      <IconChevronRight size={20} stroke={1.5} className="ml-auto" aria-hidden />
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
  return (
    <Primitive.Item {...props} className={menuItemStyles({ variant, className })}>
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
    <Primitive.CheckboxItem {...props} className={menuItemStyles({ className })}>
      <span className="size-5 flex items-center justify-center shrink-0 rounded-md bg-ui-800 inset-ring inset-ring-ui-500 text-ui-950 in-data-checked:bg-accent-500 in-data-checked:inset-ring-0">
        <Primitive.CheckboxItemIndicator
          render={<IconCheck size={20} stroke={1.5} aria-hidden />}
        />
      </span>
      {children}
    </Primitive.CheckboxItem>
  )
}

export const MenuSeparator = (props: Primitive.Separator.Props) => {
  return <Primitive.Separator className="h-px bg-ui-700 my-1 mx-2" {...props} />
}
