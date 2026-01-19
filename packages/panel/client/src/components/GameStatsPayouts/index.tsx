import { useQuery } from "@tanstack/react-query"
import { useGameContext } from "../../context/GameContext"
import { query } from "../../lib/queries"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"
import { IconChartBar, IconInfoCircle, IconMinus, IconPlus } from "@tabler/icons-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  type LabelProps,
  ResponsiveContainer,
} from "recharts"
import { Accordion } from "@base-ui/react/accordion"
import type { PayoutStatistics } from "@slot-engine/core"
import { useState } from "react"
import { cn } from "../../lib/cn"

export const StatisticsPayouts = () => {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "stats-payouts", gameId],
    queryFn: async () => {
      return await query.gameStatsPayouts(gameId)
    },
  })

  if (error) return <ErrorDisplay error={error} />

  if (!data || isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const frmt = new Intl.NumberFormat("en-DE").format

  return (
    <div>
      <h3>Payout Statistics</h3>
      <div className="mb-4">
        Information about payout ranges is available after simulation.
      </div>
      <div className="grid gap-4">
        {data.statistics.map((s) => (
          <div key={s.gameMode} className="p-4 bg-ui-900 border border-ui-700 rounded-lg">
            <h4 className="flex items-center gap-2 mb-2">
              <IconInfoCircle />
              {s.gameMode}
            </h4>
            <Accordion.Root multiple={true}>
              <ModeStatsEntry
                id="payout-occurrences"
                stats={s.allPayouts}
                title="Payout Occurrences"
                description="How often a payout range occurrs in the lookup table"
              />
              <ModeStatsEntry
                id="unique-payouts"
                stats={s.uniquePayouts}
                title="Unique Payouts"
                className="mt-2"
                description="The amount of unique payouts per range"
              />
            </Accordion.Root>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ModeStatsEntryProps extends Accordion.Item.Props {
  id: string
  stats: PayoutStatistics["allPayouts"]
  title: string
  description: string
}

const ModeStatsEntry = ({
  id,
  description,
  stats,
  title,
  ...props
}: ModeStatsEntryProps) => {
  const s = stats

  const [open, setOpen] = useState(false)

  return (
    <Accordion.Item
      onOpenChange={setOpen}
      value={id}
      {...props}
      className={cn(
        "bg-ui-950 rounded-lg border border-ui-700 overflow-clip",
        props.className,
      )}
    >
      <Accordion.Trigger className="p-4 flex gap-8 justify-between items-center w-full cursor-pointer hover:bg-ui-800 data-panel-open:bg-ui-800">
        <div className="flex items-center gap-4">
          <IconChartBar />
          <div className="text-left">
            <div className="text-xl">{title}</div>
            <div className="text-sm text-ui-100">{description}</div>
          </div>
        </div>
        {open ? <IconMinus /> : <IconPlus />}
      </Accordion.Trigger>
      <Accordion.Panel className="border-t border-ui-700 h-(--accordion-panel-height) data-starting-style:h-0 data-ending-style:h-0 duration-200">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4">
            <h5>Overall</h5>
            <div className="mb-2 text-ui-100">Values combined across all result sets</div>
            <PayoutDistribution stats={s.overall} />
          </div>
          <div className="p-4 border-l border-ui-700">
            <h5>Result Sets Payouts</h5>
            <div className="mb-2 text-ui-100">Values divided into result sets</div>
            <div className="flex items-start gap-4 overflow-x-auto">
              {Object.keys(s.criteria).map((crit) => (
                <div key={crit} className="p-4 rounded-lg bg-ui-900 min-w-lg">
                  <h6 className="mb-2">Result Set: {crit}</h6>
                  <PayoutDistribution stats={s.criteria[crit]} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Accordion.Panel>
    </Accordion.Item>
  )
}

const PayoutDistribution = ({ stats }: { stats: Record<string, number> }) => {
  const ENTRY_HEIGHT = 32
  const chartHeight = Object.keys(stats).length * ENTRY_HEIGHT + 32
  const data = Object.keys(stats).map((key) => ({
    label: key.split("-").join(" - "),
    value: stats[key],
  }))

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical">
        <XAxis type="number" width={600} stroke="var(--color-ui-500)" />
        <YAxis
          dataKey="label"
          type="category"
          width={128}
          fontSize={14}
          stroke="var(--color-ui-500)"
        />
        <Tooltip
          wrapperClassName="bg-ui-900! border-ui-700! rounded-lg"
          cursor={{ fill: "var(--color-ui-800)", radius: 4 }}
          formatter={(value) => [value, "Amount"]}
          animationDuration={50}
        />
        <Bar
          dataKey="value"
          fill="var(--color-ui-50)"
          radius={[0, 4, 4, 0]}
          background={false}
          activeBar={false}
          label={renderBarLabel}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

const renderBarLabel = ({ x, y, width, height, value }: LabelProps) => {
  const xPos = (x as number) + (width as number)
  const yPos = (y as number) + (height as number) / 2

  const isSmallBar = (width as number) > 100

  const frmt = new Intl.NumberFormat("en-DE").format

  if (isSmallBar) {
    // inside the bar
    return (
      <text
        x={xPos}
        y={yPos}
        fill="var(--color-ui-950)"
        textAnchor="end"
        dominantBaseline="middle"
        dx={-6}
        dy={1}
        fontSize={14}
      >
        {typeof value === "number" ? frmt(value) : value}
      </text>
    )
  }

  return (
    <text
      x={xPos}
      y={yPos}
      fill="var(--color-ui-50)"
      textAnchor="start"
      dominantBaseline="middle"
      dx={6}
      dy={1}
      fontSize={14}
    >
      {typeof value === "number" ? frmt(value) : value}
    </text>
  )
}
