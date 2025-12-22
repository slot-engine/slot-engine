import { useQuery } from "@tanstack/react-query"
import { query } from "../../lib/queries"
import { useState } from "react"
import { Button } from "../Button"
import { IconSettings } from "@tabler/icons-react"
import { useGameContext } from "../../context/GameContext"
import { ErrorDisplay } from "../Error"
import { Loading } from "../Loading"

export const GameSimulation = () => {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "info", gameId],
    queryFn: async () => {
      return await query.gameInfo(gameId)
    },
  })

  const [modesToSimulate, setModesToSimulate] = useState<
    Array<{ name: string; amount: number }>
  >([])

  if (error) return <ErrorDisplay error={error} />
  if (!data) return <Loading isLoading={isLoading} />

  const allModes = data.modes.map((m) => m.name)

  function addModeToSimulate(name: string) {
    setModesToSimulate((prev) => [...prev, { name, amount: 10_000 }])
  }

  return (
    <div>
      {modesToSimulate.length === 0 && (
        <div className="p-8 rounded-lg border border-ui-700 bg-ui-900  flex flex-col items-center">
          <div className="text-xl mb-2">No simulation configured</div>
          <div className="mb-4 text-ui-100">
            See how your game will perform with your current implementation
          </div>
          <Button>
            <IconSettings />
            Configure
          </Button>
        </div>
      )}
    </div>
  )
}
