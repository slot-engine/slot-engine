import { cn } from "@/lib/cn"
import { ScrollArea } from "@base-ui/react/scroll-area"

interface PageHeaderProps {
  title: string
  children?: React.ReactNode
}

export const PageHeader = ({ title, children }: PageHeaderProps) => {
  return (
    <header className="sticky top-0 z-10 h-14 px-6 flex items-center gap-6 bg-ui-950 border-b border-ui-800">
      <h1 className="text-xl font-semibold truncate min-w-0 shrink" title={title}>
        {title}
      </h1>
      {children}
    </header>
  )
}

interface PageContentProps extends React.ComponentPropsWithoutRef<"div"> {
  sidebar?: React.ReactNode
  classNames?: {
    content?: string
    sidebar?: string
  }
}

export const PageContent = ({
  children,
  sidebar,
  className,
  classNames,
  ...props
}: PageContentProps) => {
  if (sidebar) {
    return (
      <div
        {...props}
        className={cn("grid grid-cols-[minmax(0,1fr)_24rem] items-start", className)}
      >
        <ScrollArea.Root className="overflow-hidden">
          <ScrollArea.Viewport>
            <ScrollArea.Content className={cn("px-6 py-6", classNames?.content)}>
              {children}
            </ScrollArea.Content>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            orientation="horizontal"
            className="h-3 px-6 pb-1 flex items-end"
          >
            <ScrollArea.Thumb className="h-1.5 rounded-full bg-ui-700 transition-colors duration-150 hover:bg-ui-500 cursor-grab" />
          </ScrollArea.Scrollbar>
          <ScrollArea.Corner />
        </ScrollArea.Root>
        <aside
          className={cn(
            "h-content-height sticky top-nav-height overflow-y-auto scrollbar-thin py-6 pr-6",
            classNames?.sidebar,
          )}
        >
          <div className="p-4 rounded-2xl bg-ui-900 shadow-card">{sidebar}</div>
        </aside>
      </div>
    )
  }

  return (
    <div {...props} className={cn("px-6 py-6", className, classNames?.content)}>
      {children}
    </div>
  )
}
