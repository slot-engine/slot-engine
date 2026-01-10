import { useQuery } from "@tanstack/react-query"
import { useGameContext } from "../../context/GameContext"
import { query } from "../../lib/queries"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"
import { IconInfoCircle } from "@tabler/icons-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  type LabelProps,
  ResponsiveContainer,
} from "recharts"

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
          <div key={s.gameMode} className="p-4 border border-ui-700 rounded-lg">
            <h4 className="flex items-center gap-2 mb-2">
              <IconInfoCircle />
              {s.gameMode}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5>Payout Occurrences</h5>
                <PayoutDistribution stats={s.allPayouts.overall} />
              </div>
              <div>
                <h5>Unique Payouts</h5>
                <PayoutDistribution stats={s.uniquePayouts.overall} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const PayoutDistribution = ({ stats }: { stats: Record<string, number> }) => {
  const ENTRY_HEIGHT = 32
  const chartHeight = Object.keys(stats).length * ENTRY_HEIGHT
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
        {value}
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
      {value}
    </text>
  )
}
