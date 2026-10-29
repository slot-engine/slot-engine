import { cn } from "../../lib/cn"

interface TableRowProps extends React.ComponentPropsWithoutRef<"div"> {
  label: React.ReactNode
  value: React.ReactNode
}

export const TableRow = ({ label, value, className, ...props }: TableRowProps) => {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 py-2 border-b border-ui-700 first:pt-0 last:pb-0 last:border-b-0",
        className,
      )}
      {...props}
    >
      <div className="shrink-0 text-ui-500">{label}</div>
      <div
        className="min-w-0 truncate text-right tabular"
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
    </div>
  )
}
