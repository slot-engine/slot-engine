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

interface PageContentProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
}

export const PageContent = ({ children, sidebar }: PageContentProps) => {
  if (sidebar) {
    return (
      <div className="grid grid-cols-[auto_24rem]">
        <div className="px-4 py-8">{children}</div>
        <div className="px-4 py-8 border-l border-ui-700">{sidebar}</div>
      </div>
    )
  }

  return <div className="px-4 py-8">{children}</div>
}
