import { cn } from "../../lib/cn"
import { Tabs as Primitive } from "@base-ui/react/tabs"

export const tabPillStyles =
  "flex items-center gap-2 h-9 px-3 rounded-lg whitespace-nowrap cursor-pointer text-ui-100 transition-colors duration-150 hover:bg-ui-900 hover:text-ui-50"

export const Tabs = Primitive.Root

interface TabsListProps extends Primitive.List.Props {
  unstyled?: boolean
}

export const TabsList = ({ unstyled, ...props }: TabsListProps) => {
  return (
    <Primitive.List
      {...props}
      className={cn(
        !unstyled && "inline-flex items-center gap-1 p-1 rounded-xl bg-ui-950",
        props.className,
      )}
    />
  )
}

interface TabsTriggerProps extends Primitive.Tab.Props {
  unstyled?: boolean
}

export const TabsTrigger = ({ unstyled, ...props }: TabsTriggerProps) => {
  return (
    <Primitive.Tab
      {...props}
      className={cn(
        !unstyled && cn(tabPillStyles, "data-active:bg-ui-800 data-active:text-ui-50"),
        props.className,
      )}
    />
  )
}

export const TabsContent = Primitive.Panel
