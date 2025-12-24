import { cn } from "../../lib/cn"
import { Tabs as Primitive } from "@base-ui/react/tabs"

export const Tabs = Primitive.Root

export const TabsList = (props: Primitive.List.Props) => {
  return (
    <Primitive.List
      {...props}
      className={cn("border-b border-ui-700 flex", props.className)}
    />
  )
}

export const TabsTrigger = (props: Primitive.Tab.Props) => {
  return (
    <Primitive.Tab
      {...props}
      className={cn(
        "px-4 py-2 flex items-center gap-2 rounded-t-lg hover:bg-ui-800 data-active:bg-ui-700",
        props.className,
      )}
    />
  )
}

export const TabsContent = Primitive.Panel
