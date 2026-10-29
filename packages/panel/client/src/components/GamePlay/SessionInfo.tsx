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

  if (error) return <div className="text-danger-500">{error.message}</div>
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
      <div className="mt-6 mb-2 text-ui-500">Last round</div>
      {lastBet ? (
        <Rows rows={lastRound} />
      ) : (
        <div className="text-ui-500">No round played yet</div>
      )}
    </div>
  )
}

const Rows = ({ rows }: { rows: Array<[label: string, value: string]> }) => (
  <dl>
    {rows.map(([label, value]) => (
      <div
        key={label}
        className="flex items-baseline justify-between gap-4 py-2 border-b border-ui-700 first:pt-0 last:pb-0 last:border-b-0"
      >
        <dt className="shrink-0 text-ui-500">{label}</dt>
        <dd className="min-w-0 truncate text-right tabular" title={value}>
          {value}
        </dd>
      </div>
    ))}
  </dl>
)
