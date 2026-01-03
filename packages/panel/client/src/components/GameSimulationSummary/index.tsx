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
    socket.on("simulationSummary", (data) => {
      refetch()
    })

    return () => {
      socket.off("simulationSummary")
    }
  }, [])

  if (error) {
    return (
      <div className="mt-8 p-6 text-center">
        <h3>Unable to load Summary</h3>
        <p>Maybe it doesn't exist yet? Run simulations to generate it!</p>
      </div>
    )
  }

  if (!data || isLoading) return <Skeleton className="h-64 mt-8" /> 

  const modes = Object.entries(data.summary)

  return (
    <div>
      <div className="mt-8 mb-4">
        <h3>Simulation Summary</h3>
        <p className="text-ui-100">Overview of the most recent simulation.</p>
      </div>
      <div>
        {modes.map(([modeName, summary]) => (
          <div
            key={modeName}
            className="mt-4 p-6 rounded-lg border border-ui-700 bg-ui-900 grid grid-cols-2 gap-8"
          >
            <div>
              <div className="flex items-center gap-2 text-xl font-bold mb-2">
                <IconInfoCircle />
                {modeName}
              </div>
              <div className="text-ui-100 mb-2">
                Combined Statistics are calculated based on all outcomes across all
                simulations. Note that the combined, unoptimized RTP may be exceptionally
                high if the results include many max wins for variety purposes, for
                example.
              </div>
              <TableRow label="Simulations" value={summary.total.numSims} />
              <TableRow label="RTP (unoptimized)" value={summary.total.rtp} />
              <TableRow label="Basegame Wins" value={summary.total.bsWins} />
              <TableRow label="Freespins Wins" value={summary.total.fsWins} />
            </div>
            <div>
              <div className="text-xl mb-2">Result Sets Breakdown</div>
              <div className="text-ui-100 mb-4">
                Statistics of a result set are calculated based on the corresponding
                number of simulations.
              </div>
              <div className="flex gap-4 overflow-x-auto scrollbar-thin pb-2">
                {Object.entries(summary.criteria).map(([criteria, cs]) => (
                  <div key={criteria} className="bg-ui-950 p-4 rounded-md min-w-64">
                    <div className="flex items-center gap-2 mb-4">
                      <IconTargetArrow />
                      {criteria}
                    </div>
                    <div className="text-sm">
                      <TableRow label="Simulations" value={cs.numSims} />
                      <TableRow label="RTP (unoptimized)" value={cs.rtp} />
                      <TableRow label="Basegame Wins" value={cs.bsWins} />
                      <TableRow label="Freespins Wins" value={cs.fsWins} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
