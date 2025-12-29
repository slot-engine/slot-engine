import { cn } from "../../lib/cn"

interface TableRowProps extends React.ComponentPropsWithoutRef<"div"> {
  label: React.ReactNode
  value: React.ReactNode
}

export const TableRow = ({ label, value, className, ...props }: TableRowProps) => {
  return (
    <div
      className={cn("flex gap-2 py-2 border-b border-ui-700 hover:bg-ui-800", className)}
      {...props}
    >
      <div className="basis-sm font-bold">{label}</div>
      <div>{value}</div>
    </div>
  )
}
