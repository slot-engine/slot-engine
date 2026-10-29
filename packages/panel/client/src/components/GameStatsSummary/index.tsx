import { useQuery } from "@tanstack/react-query"
import { useGameContext } from "../../context/GameContext"
import { query } from "../../lib/queries"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"
import { IconInfoCircle, IconListDetails } from "@tabler/icons-react"
import { TableRow } from "../Table"
import { Button } from "../Button"
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "../Drawer"

type ModeSummary = Awaited<
  ReturnType<typeof query.gameStatsSummary>
>["statistics"][number]

interface SummaryStat {
  label: string
  format: (summary: ModeSummary) => string
  headline?: boolean
}

const formatNumber = new Intl.NumberFormat().format

const SUMMARY_STATS: SummaryStat[] = [
  { label: "Total LUT Weight", format: (s) => formatNumber(s.totalWeight) },
  { label: "Average Win", format: (s) => formatNumber(s.avgWin) },
  { label: "RTP", format: (s) => formatNumber(s.rtp), headline: true },
  { label: "Minimum Win", format: (s) => `${formatNumber(s.minWin)}x`, headline: true },
  { label: "Maximum Win", format: (s) => `${formatNumber(s.maxWin)}x`, headline: true },
  { label: "Standard Deviation", format: (s) => formatNumber(s.stdDev), headline: true },
  { label: "Variance", format: (s) => formatNumber(s.variance) },
  { label: "Non-zero Hit Rate", format: (s) => formatNumber(s.nonZeroHitRate) },
  { label: "Null Hit Rate", format: (s) => formatNumber(s.nullHitRate) },
  { label: "Max Win Hit Rate", format: (s) => formatNumber(s.maxwinHitRate) },
  { label: "Payout < Bet Hit Rate", format: (s) => formatNumber(s.lessBetHitRate) },
  { label: "Unique Payouts", format: (s) => formatNumber(s.uniquePayouts) },
]

const HEADLINE_STATS = SUMMARY_STATS.filter((stat) => stat.headline)

export const StatisticsSummary = () => {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "stats-summary", gameId],
    queryFn: async () => {
      return await query.gameStatsSummary(gameId)
    },
  })

  if (error) return <ErrorDisplay error={error} />

  return (
    <div>
      <h3 className="mb-4">Game Statistics</h3>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {!data || isLoading
          ? Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-68 rounded-2xl" />
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
                <dl className="grid grid-cols-2 gap-2">
                  {HEADLINE_STATS.map((stat) => {
                    const value = stat.format(s)
                    return (
                      <div
                        key={stat.label}
                        className="flex flex-col justify-between gap-1 rounded-xl bg-ui-800 p-3"
                      >
                        <dt className="text-ui-500">{stat.label}</dt>
                        <dd
                          className="text-base font-medium tabular truncate"
                          title={value}
                        >
                          {value}
                        </dd>
                      </div>
                    )
                  })}
                </dl>
                <Drawer>
                  <DrawerTrigger
                    render={<Button variant="secondary" className="mt-4 w-full" />}
                  >
                    <IconListDetails size={20} stroke={1.5} aria-hidden />
                    All Statistics
                  </DrawerTrigger>
                  <DrawerContent>
                    <DrawerTitle>{s.gameMode} statistics</DrawerTitle>
                    <div className="mt-4">
                      {SUMMARY_STATS.map((stat) => (
                        <TableRow
                          key={stat.label}
                          label={stat.label}
                          value={stat.format(s)}
                        />
                      ))}
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            ))}
      </div>
    </div>
  )
}
