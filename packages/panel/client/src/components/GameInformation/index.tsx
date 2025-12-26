import { useQuery } from "@tanstack/react-query"
import { query } from "../../lib/queries"
import { ErrorDisplay } from "../Error"
import { Loading } from "../Loading"
import { useGameContext } from "../../context/GameContext"
import { GameNotConfigured } from "../Error/GameNotConfigured"

export const GameInformation = () => {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "info", gameId],
    queryFn: async () => {
      return await query.gameInfo(gameId)
    },
  })

  if (error) return <ErrorDisplay error={error} />
  if (!data) return <Loading isLoading={isLoading} />

  const basicInfo = [
    { label: "ID", value: data.name },
    { label: "Name", value: data.id },
    { label: "Path", value: data.path },
    { label: "Max Win X", value: data.maxWin },
  ]

  return (
    <div>
      {!data.isValid && <GameNotConfigured />}
      <div>
        {basicInfo.map((info, i) => (
          <div key={i} className="flex gap-2 py-2 border-b border-ui-700 hover:bg-ui-800">
            <div className="basis-sm font-bold">{info.label}:</div>
            <div>{info.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <h3 className="mb-4">Game Modes</h3>
        <div className="grid grid-cols-5 gap-4">
          {data.modes.map((mode, i) => (
            <div key={i} className="p-4 rounded-lg border border-ui-700 bg-ui-900">
              <div className="text-xl font-bold mb-2">{mode.name}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>Cost: {mode.cost}x</div>
                <div>RTP: {mode.rtp}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
