import { useQuery } from "@tanstack/react-query"
import { useGameContext } from "../../context/GameContext"
import { query } from "../../lib/queries"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"
import { IconInfoCircle } from "@tabler/icons-react"
import { TableRow } from "../Table"

export const StatisticsSummary = () => {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "stats-summary", gameId],
    queryFn: async () => {
      return await query.gameStatsSummary(gameId)
    },
  })

  if (error) return <ErrorDisplay error={error} />

  if (!data || isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const frmt = new Intl.NumberFormat("en-DE").format

  return (
    <div>
      <h3 className="mb-4">Game Statistics</h3>
      <div className="grid grid-cols-3 gap-4">
        {data.statistics.map((s) => (
          <div key={s.gameMode} className="p-4 bg-ui-900 border border-ui-700 rounded-lg">
            <h4 className="flex items-center gap-2">
              <IconInfoCircle />
              {s.gameMode}
            </h4>
            <TableRow label="Total LUT Weight" value={frmt(s.totalWeight)} />
            <TableRow label="Average Win" value={frmt(s.avgWin)} />
            <TableRow label="RTP" value={frmt(s.rtp)} />
            <TableRow label="Minimum Win" value={`${frmt(s.minWin)}x`} />
            <TableRow label="Maximum Win" value={`${frmt(s.maxWin)}x`} />
            <TableRow label="Standard Deviation" value={frmt(s.stdDev)} />
            <TableRow label="Variance" value={frmt(s.variance)} />
            <TableRow label="Non-zero Hit Rate" value={frmt(s.nonZeroHitRate)} />
            <TableRow label="Null Hit Rate" value={frmt(s.nullHitRate)} />
            <TableRow label="Max Win Hit Rate" value={frmt(s.maxwinHitRate)} />
            <TableRow label="Payout < Bet Hit Rate" value={frmt(s.lessBetHitRate)} />
            <TableRow label="Unique Payouts" value={frmt(s.uniquePayouts)} />
          </div>
        ))}
      </div>
    </div>
  )
}
