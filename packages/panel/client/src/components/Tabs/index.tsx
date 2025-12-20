import { cn } from "../../lib/cn"
import { Tabs as ArkComponent } from "@ark-ui/react/tabs"

export const Tabs = ArkComponent.Root

export const TabsList = (props: ArkComponent.ListProps) => {
  return (
    <ArkComponent.List
      {...props}
      className={cn("border-b border-ui-700 flex", props.className)}
    />
  )
}

export const TabsTrigger = (props: ArkComponent.TriggerProps) => {
  return (
    <ArkComponent.Trigger
      {...props}
      className={cn(
        "px-4 py-2 flex items-center gap-2 rounded-t-lg hover:bg-ui-800 data-selected:bg-ui-700",
        props.className,
      )}
    />
  )
}

export const TabsContent = ArkComponent.Content
