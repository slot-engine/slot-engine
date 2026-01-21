import { cn } from "../../lib/cn"
import { Tabs as Primitive } from "@base-ui/react/tabs"

export const Tabs = Primitive.Root

interface TabsListProps extends Primitive.List.Props {
  unstyled?: boolean
}

export const TabsList = ({ unstyled, ...props }: TabsListProps) => {
  return (
    <Primitive.List
      {...props}
      className={cn(!unstyled && "border-b border-ui-700 flex", props.className)}
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
        !unstyled &&
          "px-4 py-2 flex items-center gap-2 rounded-t-lg hover:bg-ui-800 data-active:bg-ui-700",
        props.className,
      )}
    />
  )
}

export const TabsContent = Primitive.Panel
