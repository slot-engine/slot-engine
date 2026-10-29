import { cn } from "@/lib/cn"
import { ContextMenu as Primitive } from "@base-ui/react/context-menu"
import { IconChevronRight } from "@tabler/icons-react"
import { menuItemStyles, menuPopupStyles } from "../Menu"

export const ContextMenu = Primitive.Root

interface ContextMenuTriggerProps extends Primitive.Trigger.Props {}

export const ContextMenuTrigger = ({
  className,
  children,
  ...props
}: ContextMenuTriggerProps) => {
  return (
    <Primitive.Trigger className={cn("flex gap-2 items-center", className)} {...props}>
      {children}
    </Primitive.Trigger>
  )
}

interface ContextMenuContentProps extends Primitive.Popup.Props {}

export const ContextMenuContent = ({
  className,
  children,
  ...props
}: ContextMenuContentProps) => {
  return (
    <Primitive.Portal>
      <Primitive.Positioner>
        <Primitive.Popup className={cn(menuPopupStyles, className)} {...props}>
          {children}
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  )
}

export const ContextMenuSubmenu = Primitive.SubmenuRoot

interface ContextMenuSubmenuTriggerProps extends Primitive.SubmenuTrigger.Props {}

export const ContextMenuSubmenuTrigger = ({
  className,
  children,
  ...props
}: ContextMenuSubmenuTriggerProps) => {
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

interface ContextMenuItemProps extends Primitive.Item.Props {}

export const ContextMenuItem = ({
  className,
  children,
  ...props
}: ContextMenuItemProps) => {
  return (
    <Primitive.Item className={menuItemStyles({ className })} {...props}>
      {children}
    </Primitive.Item>
  )
}
