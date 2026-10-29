import { useQuery } from "@tanstack/react-query"
import { getSession } from "@/lib/lgs"
import { Skeleton } from "../Skeleton"
import { formatAmount } from "./settings"

export const SessionInfo = ({ sessionId }: { sessionId: string }) => {
  const { data, error } = useQuery({
    queryKey: ["lgs", "session", sessionId],
    queryFn: () => getSession(sessionId),
    refetchInterval: 2000,
  })

  if (error) return <div className="text-sm text-red-500">{error.message}</div>
  if (!data) return <Skeleton className="h-32" />

  const { wallet, lastBet } = data
  const rows: Array<[label: string, value: string]> = [
    ["Balance", formatAmount(wallet.amount)],
    ["Currency", wallet.currency],
  ]
  const lastRound: Array<[label: string, value: string]> = lastBet
    ? [
        ["Book", `${lastBet.bookId} (${lastBet.mode})`],
        ["Multiplier", `${lastBet.payoutMultiplier}x`],
        ["Payout", formatAmount(lastBet.payout)],
      ]
    : []

  return (
    <div>
      <Rows rows={rows} />
      <div className="mt-4 mb-1 text-ui-500">Last round</div>
      {lastBet ? (
        <Rows rows={lastRound} />
      ) : (
        <div className="text-sm text-ui-500">No round played yet</div>
      )}
    </div>
  )
}

const Rows = ({ rows }: { rows: Array<[label: string, value: string]> }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
    {rows.map(([label, value]) => (
      <div key={label} className="contents">
        <dt className="text-ui-500">{label}</dt>
        <dd className="text-right font-mono">{value}</dd>
      </div>
    ))}
  </dl>
)
