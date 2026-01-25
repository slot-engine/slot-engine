import { cn } from "@/lib/cn"
import { ContextMenu as Primitive } from "@base-ui/react/context-menu"
import { IconChevronRight } from "@tabler/icons-react"

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
        <Primitive.Popup className={className} {...props}>
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
      className={cn("flex gap-2 items-center", className)}
      {...props}
    >
      {children}
      <IconChevronRight className="ml-auto" />
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
    <Primitive.Item className={className} {...props}>
      {children}
    </Primitive.Item>
  )
}
