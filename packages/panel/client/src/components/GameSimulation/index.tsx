import { useQuery } from "@tanstack/react-query"
import { query } from "../../lib/queries"
import { useState } from "react"
import { Button } from "../Button"
import { IconLock, IconPlus, IconSettings, IconTrash } from "@tabler/icons-react"
import { useGameContext } from "../../context/GameContext"
import { ErrorDisplay } from "../Error"
import { Loading } from "../Loading"
import { NumberInput } from "../NumberInput"
import { Select, SelectContent, SelectItem, SelectTrigger } from "../Select"

export const GameSimulation = () => {
  const { gameId } = useGameContext()

  const { data, isLoading, error } = useQuery({
    queryKey: ["game", "info", gameId],
    queryFn: async () => {
      return await query.gameInfo(gameId)
    },
  })

  const [modesToSimulate, setModesToSimulate] = useState<GameModeSimulation[]>([])

  if (error) return <ErrorDisplay error={error} />
  if (!data) return <Loading isLoading={isLoading} />

  const allModes = data.modes.map((m) => m.name)
  const availableModes = allModes.filter(
    (m) => !modesToSimulate.find((s) => s.name === m),
  )

  function addModeToSimulate(name: string) {
    setModesToSimulate((prev) => [
      ...prev,
      { name, amount: 10_000, isSimulating: false, progress: 0 },
    ])
  }

  function updateModeAmount(name: string, amount: number | null) {
    if (amount === null) return
    setModesToSimulate((prev) =>
      prev.map((m) => (m.name === name ? { ...m, amount } : m)),
    )
  }

  function removeModeToSimulate(name: string) {
    setModesToSimulate((prev) => prev.filter((m) => m.name !== name))
  }

  function changeMode(o: string, n: string | null) {
    if (!n) return
    setModesToSimulate((prev) => prev.map((m) => (m.name === o ? { ...m, name: n } : m)))
  }

  console.log(availableModes)
  console.log(modesToSimulate)

  return (
    <div>
      {modesToSimulate.length === 0 && (
        <div className="p-8 rounded-lg border border-ui-700 bg-ui-900 flex flex-col items-center">
          <div className="text-xl mb-2">No simulation configured</div>
          <div className="mb-4 text-ui-100">
            See how your game will perform with your current implementation
          </div>

          {availableModes.length > 0 ? (
            <Button onClick={() => addModeToSimulate(availableModes[0])}>
              <IconSettings />
              Configure
            </Button>
          ) : (
            <div className="text-red-600">
              Your game has no game modes available to simulate.
            </div>
          )}
        </div>
      )}

      {modesToSimulate.map((mode, i) => (
        <div
          key={i}
          className="p-4 mb-4 flex gap-8 rounded-lg border border-ui-700 bg-ui-900"
        >
          {availableModes.length > 0 ? (
            <div>
              <Select
                label="Mode"
                value={mode.name}
                multiple={false}
                onValueChange={(v) => changeMode(mode.name, v)}
              >
                <SelectTrigger className="w-64" />
                <SelectContent>
                  {availableModes.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <div className="mb-1">Mode</div>
              <div className="pl-3 pr-2 py-2 bg-ui-950 rounded-lg w-64 truncate flex gap-4 justify-between items-center">
                {mode.name}
                <IconLock className="text-ui-700" />
              </div>
            </div>
          )}
          <div>
            <NumberInput
              label="Number of Simulations"
              step={1}
              inputMode="numeric"
              className="w-64"
              value={mode.amount}
              onValueChange={(v) => updateModeAmount(mode.name, v)}
            />
          </div>
          <div className="flex grow items-center justify-end">
            <Button
              variant="ghost"
              className="text-red-500"
              isIconButton
              onClick={() => removeModeToSimulate(mode.name)}
            >
              <IconTrash />
            </Button>
          </div>
        </div>
      ))}

      {modesToSimulate.length > 0 && availableModes.length > 0 && (
        <Button onClick={() => addModeToSimulate(availableModes[0])}>
          <IconPlus />
          Add another Mode
        </Button>
      )}
    </div>
  )
}

interface GameModeSimulation {
  name: string
  amount: number
  isSimulating: boolean
  progress: number
}
