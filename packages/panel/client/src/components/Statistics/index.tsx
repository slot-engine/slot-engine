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

const TONES = {
  success: { tile: "bg-accent-950", text: "text-accent-500", dot: "bg-accent-500" },
  warning: { tile: "bg-warning-950", text: "text-warning-500", dot: "bg-warning-500" },
  danger: { tile: "bg-danger-950", text: "text-danger-500", dot: "bg-danger-500" },
}

type Tone = keyof typeof TONES

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
  const statuses: Array<{ tone: Tone; text: string }> = []
  if (isSuccess)
    statuses.push({ tone: "success", text: successText || "This value seems correct" })
  if (isWarning)
    statuses.push({ tone: "warning", text: warningText || "This value seems unusual" })
  if (isDanger)
    statuses.push({ tone: "danger", text: dangerText || "This value seems incorrect" })
  const tileTone = statuses[0]?.tone

  return (
    <div
      {...props}
      className={cn(
        "p-4 rounded-xl bg-ui-800",
        tileTone && TONES[tileTone].tile,
        classNames?.container,
      )}
    >
      <div className="text-ui-100">{label}</div>
      {description && <div className="text-xs mt-1 text-ui-100">{description}</div>}
      <div className={cn("flex items-baseline gap-2 mt-2", classNames?.valueContainer)}>
        {valuePrefix}
        <div className={cn("text-2xl font-semibold tabular", classNames?.value)}>
          {value}
        </div>
        {valueSuffix}
      </div>
      {info && <div className="text-xs mt-1 text-ui-100">{info}</div>}
      {statuses.map(({ tone, text }) => (
        <div
          key={tone}
          className={cn("mt-2 flex items-center gap-2 text-xs", TONES[tone].text)}
        >
          <span
            className={cn("size-2 shrink-0 rounded-full", TONES[tone].dot)}
            aria-hidden
          />
          {text}
        </div>
      ))}
    </div>
  )
}
