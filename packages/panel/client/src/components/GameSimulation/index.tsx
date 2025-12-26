import { useMutation, useQuery } from "@tanstack/react-query"
import { mutation, query } from "../../lib/queries"
import { useEffect, useRef, useState } from "react"
import { Button } from "../Button"
import {
  IconExternalLink,
  IconLock,
  IconPlayerPlay,
  IconPlus,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react"
import { useGameContext } from "../../context/GameContext"
import { ErrorDisplay } from "../Error"
import { Loading } from "../Loading"
import { NumberInput } from "../NumberInput"
import { Select, SelectContent, SelectItem, SelectTrigger } from "../Select"

type SimConfig = Parameters<typeof mutation.gameSimConf>[1]
type SimConfigWithoutGames = Omit<SimConfig, "simRunsAmount">

export const GameSimulation = () => {
  const { gameId } = useGameContext()

  const { data, isLoading, isFetching, error, dataUpdatedAt } = useQuery({
    queryKey: ["game", "info-advanced", gameId],
    queryFn: async () => {
      const info = await query.gameInfo(gameId)
      const simConf = await query.gameSimConf(gameId)
      return { ...info, simulation: simConf }
    },
    refetchOnWindowFocus: false,
  })

  const updateConfMutation = useMutation({
    mutationKey: ["game", "sim-conf", gameId],
    mutationFn: async (data: SimConfig) => {
      return await mutation.gameSimConf(gameId, data)
    },
  })

  const [modesToSimulate, setModesToSimulate] = useState<GameModeSimulation[]>([])
  const [simSettings, setSimSettings] = useState<SimConfigWithoutGames | null>(null)
  const lastDataTimestamp = useRef<number | null>(null)
  const isUserChange = useRef(false)

  useEffect(() => {
    if (!data) return

    if (lastDataTimestamp.current === dataUpdatedAt) return

    const serverConfig = Object.entries(data.simulation.simRunsAmount).map(
      ([name, amount]) => ({
        name,
        amount,
        isSimulating: false,
        progress: 0,
      }),
    )

    setModesToSimulate(serverConfig)
    setSimSettings({
      concurrency: data.simulation.concurrency,
      maxPendingSims: data.simulation.maxPendingSims,
      maxDiskBuffer: data.simulation.maxDiskBuffer,
    })
    lastDataTimestamp.current = dataUpdatedAt
  }, [data, dataUpdatedAt])

  useEffect(() => {
    if (!isUserChange.current) return
    if (!data) return

    const simRunsAmount: Record<string, number> = {}
    modesToSimulate.forEach((m) => {
      simRunsAmount[m.name] = m.amount
    })

    const newData = {
      simRunsAmount,
      concurrency: simSettings?.concurrency as number,
      maxPendingSims: simSettings?.maxPendingSims as number,
      maxDiskBuffer: simSettings?.maxDiskBuffer as number,
    }

    updateConfMutation.mutate(newData)
    isUserChange.current = false
  }, [modesToSimulate, simSettings, data])

  useEffect(() => {
    lastDataTimestamp.current = null
    isUserChange.current = false
  }, [gameId])

  if (error) return <ErrorDisplay error={error} />
  if (!data || isFetching) return <Loading isLoading={isLoading || isFetching} />

  const allModes = data.modes.map((m) => m.name)
  const availableModes = allModes.filter(
    (m) => !modesToSimulate.find((s) => s.name === m),
  )

  function addModeToSimulate(name: string) {
    isUserChange.current = true
    setModesToSimulate((prev) => [
      ...prev,
      { name, amount: 10_000, isSimulating: false, progress: 0 },
    ])
  }

  function addAllModesToSimulate() {
    isUserChange.current = true
    const newModes = allModes.map((name) => ({
      name,
      amount: 10_000,
      isSimulating: false,
      progress: 0,
    }))
    setModesToSimulate(newModes)
  }

  function updateModeAmount(name: string, amount: number | null) {
    if (amount === null) return
    isUserChange.current = true
    setModesToSimulate((prev) =>
      prev.map((m) => (m.name === name ? { ...m, amount } : m)),
    )
  }

  function removeModeToSimulate(name: string) {
    isUserChange.current = true
    setModesToSimulate((prev) => prev.filter((m) => m.name !== name))
  }

  function changeMode(o: string, n: string | null) {
    if (!n) return
    isUserChange.current = true
    setModesToSimulate((prev) => prev.map((m) => (m.name === o ? { ...m, name: n } : m)))
  }

  return (
    <div className="grid grid-cols-[2fr_1fr] gap-8 items-start">
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
          <div className="flex gap-2">
            <Button onClick={() => addModeToSimulate(availableModes[0])}>
              <IconPlus />
              Add another Mode
            </Button>
            <Button variant="secondary" onClick={() => addAllModesToSimulate()}>
              <IconPlus />
              Add all Modes
            </Button>
          </div>
        )}
      </div>
      {simSettings && (
        <div className="sticky top-0 p-6 bg-ui-900 border border-ui-700 rounded-lg">
          <div className="text-xl mb-2">Simulation Control Panel</div>
          <a
            className="link"
            href="https://slot-engine.dev/docs/core/game-tasks/simulation#options"
            target="_blank"
          >
            Configuration Options Reference
            <IconExternalLink size={20} />
          </a>
          <NumberInput
            label="Concurrency (Threads)"
            step={1}
            inputMode="numeric"
            value={simSettings?.concurrency}
            onValueChange={(v) => {
              isUserChange.current = true
              setSimSettings((prev) => ({ ...prev!, concurrency: v ?? 0 }))
            }}
          />
          <NumberInput
            label="Max Pending Simulations"
            step={1}
            inputMode="numeric"
            className="mt-4"
            value={simSettings?.maxPendingSims}
            onValueChange={(v) => {
              isUserChange.current = true
              setSimSettings((prev) => ({ ...prev!, maxPendingSims: v ?? 0 }))
            }}
          />
          <NumberInput
            label="Max Disk Buffer (in MB)"
            step={1}
            inputMode="numeric"
            className="mt-4"
            value={simSettings?.maxDiskBuffer}
            onValueChange={(v) => {
              isUserChange.current = true
              setSimSettings((prev) => ({ ...prev!, maxDiskBuffer: v ?? 0 }))
            }}
          />
          <Button className="mt-4" disabled={modesToSimulate.length === 0}>
            <IconPlayerPlay />
            Start Simulation
          </Button>
        </div>
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
