import { useQuery } from "@tanstack/react-query"
import { useGameContext } from "../../context/GameContext"
import { query } from "../../lib/queries"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"
import { IconChartBar, IconInfoCircle } from "@tabler/icons-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  type LabelProps,
  type BarShapeProps,
  Rectangle,
  ResponsiveContainer,
} from "recharts"
import type { PayoutRangeBreakdown } from "@slot-engine/core"
import { Button } from "../Button"
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../Dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs"

type ModePayouts = Awaited<
  ReturnType<typeof query.gameStatsPayouts>
>["statistics"][number]

export const StatisticsPayouts = () => {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "stats-payouts", gameId],
    queryFn: async () => {
      return await query.gameStatsPayouts(gameId)
    },
  })

  if (error) return <ErrorDisplay error={error} />

  return (
    <div>
      <h3>Payout Statistics</h3>
      <p className="mt-1 mb-4 text-ui-500">
        Information about payout ranges is available after simulation.
      </p>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {!data || isLoading
          ? Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))
          : data.statistics.map((s) => (
              <div key={s.gameMode} className="p-4 rounded-2xl bg-ui-900 shadow-card">
                <h4 className="flex items-center gap-2 mb-4">
                  <IconInfoCircle
                    size={20}
                    stroke={1.5}
                    className="shrink-0 text-ui-500"
                    aria-hidden
                  />
                  <span className="min-w-0 truncate" title={s.gameMode}>
                    {s.gameMode}
                  </span>
                </h4>
                <Dialog>
                  <DialogTrigger
                    render={<Button variant="secondary" className="w-full" />}
                  >
                    <IconChartBar size={20} stroke={1.5} aria-hidden />
                    Open Statistics
                  </DialogTrigger>
                  <DialogContent width="xl">
                    <DialogTitle>{s.gameMode} payout statistics</DialogTitle>
                    <Tabs
                      defaultValue={PAYOUT_TABS[0].value}
                      className="flex min-h-0 flex-col"
                    >
                      <TabsList className="mt-3 self-start">
                        {PAYOUT_TABS.map((tab) => (
                          <TabsTrigger key={tab.value} value={tab.value}>
                            {tab.title}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {PAYOUT_TABS.map((tab) => {
                        const breakdown = tab.select(s)
                        return (
                          <TabsContent
                            key={tab.value}
                            value={tab.value}
                            className="mt-4 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin"
                          >
                            <p className="text-ui-500">{tab.description}</p>
                            <div className="mt-4 grid grid-cols-2 gap-2 p-2 rounded-xl bg-ui-950">
                              <div className="p-2">
                                <h5>Overall</h5>
                                <div className="mb-4 text-ui-500">
                                  Values combined across all result sets
                                </div>
                                <PayoutDistribution
                                  stats={breakdown.overall}
                                  format={tab.format}
                                />
                              </div>
                              <div className="min-w-0 p-2">
                                <h5>Result Sets Payouts</h5>
                                <div className="mb-4 text-ui-500">
                                  Values divided into result sets
                                </div>
                                <div className="flex items-start gap-2 overflow-x-auto scrollbar-thin pb-2">
                                  {Object.keys(breakdown.criteria).map((crit) => (
                                    <div
                                      key={crit}
                                      className="p-4 rounded-xl bg-ui-900 min-w-lg"
                                    >
                                      <h6 className="mb-2">Result Set: {crit}</h6>
                                      <PayoutDistribution
                                        stats={breakdown.criteria[crit]}
                                        format={tab.format}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        )
                      })}
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
      </div>
    </div>
  )
}

interface ValueFormat {
  name: string
  domain?: [number, number]
  ticks?: number[]
  tick?: (value: number) => string
  label: (value: number) => string
}

const percent = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumSignificantDigits: 3,
})
const wholePercent = new Intl.NumberFormat(undefined, { style: "percent" })
const fewSpins = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 })
const manySpins = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

function formatChance(chance: number) {
  if (chance === 0) return `${percent.format(0)} (never hit)`
  const spins = 1 / chance
  const spinsText = (spins < 100 ? fewSpins : manySpins).format(spins)
  return `${percent.format(chance)} (1 in ${spinsText} Spins)`
}

const VALUE_FORMATS = {
  count: {
    name: "Amount",
    label: new Intl.NumberFormat().format,
  },
  chance: {
    name: "Chance",
    domain: [0, 1],
    ticks: [0, 0.25, 0.5, 0.75, 1],
    tick: wholePercent.format,
    label: formatChance,
  },
} satisfies Record<string, ValueFormat>

interface PayoutTab {
  value: string
  title: string
  description: string
  select: (stats: ModePayouts) => PayoutRangeBreakdown
  format: ValueFormat
}

const PAYOUT_TABS: PayoutTab[] = [
  {
    value: "payout-occurrences",
    title: "Payout Occurrences",
    description: "How often a payout range occurs in the lookup table",
    select: (stats) => stats.allPayouts,
    format: VALUE_FORMATS.count,
  },
  {
    value: "payout-chances",
    title: "Payout Chances",
    description: "Likelihood of hitting a payout range during play",
    select: (stats) => stats.payoutChances,
    format: VALUE_FORMATS.chance,
  },
  {
    value: "unique-payouts",
    title: "Unique Payouts",
    description: "The amount of unique payouts per range",
    select: (stats) => stats.uniquePayouts,
    format: VALUE_FORMATS.count,
  },
]

const PayoutDistribution = ({
  stats,
  format,
}: {
  stats: Record<string, number>
  format: ValueFormat
}) => {
  const ENTRY_HEIGHT = 32
  const chartHeight = Object.keys(stats).length * ENTRY_HEIGHT + 32
  const data = Object.entries(stats).map(([key, value]) => ({
    label: key.split("-").join(" - "),
    value,
    text: format.label(value),
  }))

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={data} layout="vertical">
        <XAxis
          type="number"
          width={600}
          stroke="var(--color-ui-700)"
          tick={{ fill: "var(--color-ui-500)" }}
          fontSize={12}
          domain={format.domain}
          ticks={format.ticks}
          tickFormatter={format.tick}
        />
        <YAxis
          dataKey="label"
          type="category"
          width={128}
          fontSize={12}
          stroke="var(--color-ui-700)"
          tick={{ fill: "var(--color-ui-500)" }}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: "var(--color-ui-50)" }}
          itemStyle={{ color: "var(--color-ui-100)" }}
          cursor={{ fill: "var(--color-ui-800)", radius: 4 }}
          formatter={(value) => [
            typeof value === "number" ? format.label(value) : value,
            format.name,
          ]}
          animationDuration={50}
        />
        <Bar
          dataKey="value"
          fill="var(--color-accent-500)"
          radius={[0, 4, 4, 0]}
          background={false}
          activeBar={false}
          shape={BarShape}
          label={{ dataKey: "text", content: renderBarLabel }}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--color-ui-900)",
  border: "none",
  borderRadius: 12,
  boxShadow: "var(--shadow-popup)",
  fontSize: 14,
}

// Recharts drops zero-width bars and their labels unless the bar has a custom shape,
// which would hide the label of a payout range that is never hit.
const BarShape = (props: BarShapeProps) => <Rectangle {...props} />

const LABEL_PLACEMENT = {
  inside: { fill: "var(--color-ui-950)", textAnchor: "end", dx: -6 },
  outside: { fill: "var(--color-ui-50)", textAnchor: "start", dx: 6 },
} as const

const renderBarLabel = ({ x, y, width, height, value }: LabelProps) => {
  const text = String(value)
  const fitsInside = (width as number) > text.length * 8 + 16

  return (
    <text
      x={(x as number) + (width as number)}
      y={(y as number) + (height as number) / 2}
      {...LABEL_PLACEMENT[fitsInside ? "inside" : "outside"]}
      dominantBaseline="middle"
      dy={1}
      fontSize={14}
    >
      {text}
    </text>
  )
}
