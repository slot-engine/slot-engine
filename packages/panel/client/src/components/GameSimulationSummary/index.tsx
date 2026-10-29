import { useQuery } from "@tanstack/react-query"
import { query } from "../../lib/queries"
import { useGameContext } from "../../context/GameContext"
import { TableRow } from "../Table"
import { IconInfoCircle, IconTargetArrow } from "@tabler/icons-react"
import { useEffect } from "react"
import { socket } from "../../context/Websocket"
import { Skeleton } from "../Skeleton"

export const GameSimulationSummary = () => {
  const { gameId } = useGameContext()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["game", "simulation-summary", gameId],
    queryFn: async () => {
      return await query.gameSimSummary(gameId)
    },
  })

  useEffect(() => {
    socket.on("simulationSummary", () => {
      refetch()
    })

    return () => {
      socket.off("simulationSummary")
    }
  }, [])

  if (error) {
    return (
      <div className="mt-10 p-6 text-center">
        <h3>Unable to load Summary</h3>
        <p className="mt-1 text-ui-500">
          Maybe it doesn't exist yet? Run simulations to generate it!
        </p>
      </div>
    )
  }

  if (!data || isLoading) return <Skeleton className="h-64 mt-10 rounded-2xl" />

  const modes = Object.entries(data.summary)
  const frmt = new Intl.NumberFormat().format

  return (
    <div className="mt-10">
      <h3>Simulation Summary</h3>
      <p className="mt-1 text-ui-500">
        Overview of the most recent simulation. NOT optimized results.
      </p>
      {modes.map(([modeName, summary]) => (
        <div
          key={modeName}
          className="mt-4 p-4 rounded-2xl bg-ui-900 shadow-card grid grid-cols-2 gap-8"
        >
          <div>
            <h4 className="flex items-center gap-2">
              <IconInfoCircle
                size={20}
                stroke={1.5}
                className="text-ui-500"
                aria-hidden
              />
              {modeName}
            </h4>
            <p className="mt-1 mb-4 text-ui-500">
              Combined Statistics are calculated based on all outcomes across all
              simulations. Note that the combined, unoptimized RTP may be exceptionally
              high if the results include many max wins for variety purposes, for example.
            </p>
            <TableRow label="Simulations" value={frmt(summary.total.numSims)} />
            <TableRow label="RTP (unoptimized)" value={frmt(summary.total.rtp)} />
            <TableRow label="Basegame Wins" value={frmt(summary.total.bsWins)} />
            <TableRow label="Freespins Wins" value={frmt(summary.total.fsWins)} />
          </div>
          <div className="min-w-0">
            <h4>Result Sets Breakdown</h4>
            <p className="mt-1 mb-4 text-ui-500">
              Statistics of a result set are calculated based on the corresponding number
              of simulations.
            </p>
            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
              {Object.entries(summary.criteria).map(([criteria, cs]) => (
                <div key={criteria} className="p-4 rounded-xl bg-ui-950 min-w-64">
                  <div className="flex items-center gap-2 mb-3 font-medium">
                    <IconTargetArrow
                      size={20}
                      stroke={1.5}
                      className="text-ui-100"
                      aria-hidden
                    />
                    {criteria}
                  </div>
                  <div>
                    <TableRow label="Simulations" value={frmt(cs.numSims)} />
                    <TableRow label="RTP (unoptimized)" value={frmt(cs.rtp)} />
                    <TableRow label="Basegame Wins" value={frmt(cs.bsWins)} />
                    <TableRow label="Freespins Wins" value={frmt(cs.fsWins)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
