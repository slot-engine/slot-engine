import { cn } from "../../lib/cn"

interface StatisticsProps extends React.ComponentPropsWithoutRef<"div"> {
  label: React.ReactNode
  valuePrefix?: React.ReactNode
  value: React.ReactNode
  valueSuffix?: React.ReactNode
  description?: string
  info?: string
  isSuccess?: boolean
  successText?: string
  isWarning?: boolean
  warningText?: string
  isDanger?: boolean
  dangerText?: string
  classNames?: {
    container?: string
    valueContainer?: string
    value?: string
  }
}

export const Statistics = ({
  label,
  value,
  valuePrefix,
  valueSuffix,
  description,
  info,
  isSuccess,
  successText,
  isWarning,
  warningText,
  isDanger,
  dangerText,
  classNames,
  ...props
}: StatisticsProps) => {
  return (
    <div
      {...props}
      className={cn(
        "px-4 py-3 rounded-r-lg bg-ui-950 border-l-4 border-ui-500",
        isDanger && "border-red-500 bg-red-950",
        isWarning && "border-orange-500 bg-orange-950",
        isSuccess && "border-emerald-500 bg-emerald-950",
        classNames?.container,
      )}
    >
      <div>{label}</div>
      {description && (
        <div className="text-xs mt-1 mb-1 leading-4 text-ui-100">{description}</div>
      )}
      <div className={cn("flex items-baseline gap-2", classNames?.valueContainer)}>
        {valuePrefix}
        <div className={cn("font-bold text-2xl", classNames?.value)}>{value}</div>
        {valueSuffix}
      </div>
      {info && <div className="text-xs mt-1 leading-4 text-ui-500">{info}</div>}
      {isSuccess && (
        <div className="mt-1 text-xs text-emerald-500">
          {successText || "This value seems correct"}
        </div>
      )}
      {isWarning && (
        <div className="mt-1 text-xs text-orange-500">
          {warningText || "This value seems unusual"}
        </div>
      )}
      {isDanger && (
        <div className="mt-1 text-xs text-red-500">
          {dangerText || "This value seems incorrect"}
        </div>
      )}
    </div>
  )
}
