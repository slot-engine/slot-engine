import { cn } from "@/lib/cn"

interface PageHeaderProps {
  title: string
  children?: React.ReactNode
}

export const PageHeader = ({ title, children }: PageHeaderProps) => {
  return (
    <div className="px-4 h-14 border-b border-ui-700 flex items-center sticky top-0 bg-ui-950 z-10">
      <div className="text-xl h-14 flex items-center border-r border-ui-700 pr-4 w-80">
        {title}
      </div>
      {children}
    </div>
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
        className={cn("grid grid-cols-[auto_24rem] items-start", className)}
      >
        <div className={cn("px-4 py-8", classNames?.content)}>{children}</div>
        <div
          className={cn(
            "px-4 py-8 border-l border-ui-700 h-content-height sticky top-nav-height",
            classNames?.sidebar,
          )}
        >
          {sidebar}
        </div>
      </div>
    )
  }

  return (
    <div {...props} className={cn("px-4 py-8", className, classNames?.content)}>
      {children}
    </div>
  )
}
