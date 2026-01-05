import {
  IconBusinessplan,
  IconInfoCircle,
  IconLoader2,
  IconPlayerPlay,
  IconPlus,
  IconReportAnalytics,
  IconSettings,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react"
import { useGameContext } from "../../context/GameContext"
import { useEffect, useRef, useState } from "react"
import { Button } from "../Button"
import { NumberInput } from "../NumberInput"
import { mutation, query } from "../../lib/queries"
import { useMutation, useQuery, type UseMutationResult } from "@tanstack/react-query"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"
import type { BetSimulationConfig } from "../../../../server/types"
import { Select, SelectContent, SelectItem, SelectTrigger } from "../Select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../Tabs"
import { SimulationLoading } from "../Loading"

const DEFAULT_CONFIG: BetSimulationConfig = {
  id: "",
  players: {
    count: 100,
    startingBalance: 1000,
  },
  balanceMode: "fresh",
  betGroups: [],
}

function makeDefaultConfig(): BetSimulationConfig {
  return {
    ...DEFAULT_CONFIG,
    id: crypto.randomUUID(),
  }
}

function makeDefaultBetGroup(mode: string) {
  return {
    id: crypto.randomUUID(),
    mode,
    betAmount: 1,
    spins: 500,
  }
}

export const GameBetSimulation = () => {
  const { gameId, game } = useGameContext()

  const { data, isFetching, error, dataUpdatedAt } = useQuery({
    queryKey: ["game", "bet-sim-conf", gameId],
    queryFn: async () => {
      return await query.gameBetSimConf(gameId)
    },
    refetchOnWindowFocus: false,
  })

  const updateConfMutation = useMutation({
    mutationKey: ["game", "bet-sim-conf", gameId],
    mutationFn: async (data: BetSimulationConfig[]) => {
      return await mutation.gameBetSimConf(gameId, data)
    },
  })

  const [betConfigs, setBetConfigs] = useState<BetSimulationConfig[]>([])
  const lastDataTimestamp = useRef<number | null>(null)
  const isUserChange = useRef(false)

  useEffect(() => {
    if (!data) return
    if (lastDataTimestamp.current === dataUpdatedAt) return

    setBetConfigs(data.configs)
    lastDataTimestamp.current = dataUpdatedAt
  }, [data, dataUpdatedAt])

  useEffect(() => {
    if (!isUserChange.current) return
    if (!data) return

    updateConfMutation.mutate(betConfigs)
    isUserChange.current = false
  }, [betConfigs, data])

  useEffect(() => {
    lastDataTimestamp.current = null
    isUserChange.current = false
  }, [gameId])

  if (error) return <ErrorDisplay error={error} />

  if (!data || isFetching) {
    return (
      <div className="grid grid-cols-[2fr_1fr] gap-4 items-start">
        <div>
          <Skeleton className="h-32" />
          <Skeleton className="h-32 mt-4" />
          <Skeleton className="h-32 mt-4" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  function addBetSimConfig() {
    isUserChange.current = true
    setBetConfigs((prev) => [...prev, makeDefaultConfig()])
  }

  function onConfigChange(config: BetSimulationConfig) {
    isUserChange.current = true
    setBetConfigs((prev) => prev.map((c) => (c.id === config.id ? config : c)))
  }

  function removeSimulation(id: string) {
    isUserChange.current = true
    setBetConfigs((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="grid grid-cols-[2fr_1fr] gap-4 items-start">
      <div>
        {betConfigs.length > 0 ? (
          betConfigs.map((config, index) => (
            <BetSimulation
              config={config}
              onValueChange={onConfigChange}
              removeSimulation={removeSimulation}
              key={index}
              isSaving={updateConfMutation.isPending}
            />
          ))
        ) : (
          <div className="p-8 rounded-lg border border-ui-700 bg-ui-900 flex flex-col items-center">
            <div className="text-xl mb-2">No simulation configured</div>
            <div className="mb-4 text-ui-100">
              See how your game might perform with your current results
            </div>
            <Button onClick={() => addBetSimConfig()}>
              <IconSettings />
              Configure
            </Button>
          </div>
        )}
        {betConfigs.length > 0 && (
          <Button className="mt-4" onClick={() => addBetSimConfig()}>
            <IconPlus />
            Add another Simulation
          </Button>
        )}
      </div>
      <div className="p-6 rounded-lg bg-ui-900 border border-ui-700 sticky top-16">
        <div className="flex items-center gap-2 mb-2">
          <IconInfoCircle />
          <h4>How does this work?</h4>
        </div>
        <p>
          This module simulates game behavior with multiple players betting on the game
          under equal circumstances. For each "spin" a virtual player does, a random
          weighted result from the lookup table is chosen, similar to real Stake RGS
          functionality.
        </p>
        <p>
          After simulation you'll be presented with the results and how your game performs
          on average.
        </p>
        <p>
          You can configure and run as many simultaneous simulations as you like. Your
          configuration will be saved.
        </p>
      </div>
    </div>
  )
}

interface BetSimulationProps {
  config: BetSimulationConfig
  onValueChange: (config: BetSimulationConfig) => void
  removeSimulation: (id: string) => void
  isSaving: boolean
}

const BetSimulation = ({
  config,
  onValueChange,
  removeSimulation,
  isSaving,
}: BetSimulationProps) => {
  const { game, gameId } = useGameContext()

  function updatePlayerCount(count: number | null) {
    const newConfig = {
      ...config,
      players: { ...config.players, count: count ?? config.players.count },
    }
    onValueChange(newConfig)
  }

  function updateStartingBalance(balance: number | null) {
    const newConfig = {
      ...config,
      players: {
        ...config.players,
        startingBalance: balance ?? config.players.startingBalance,
      },
    }
    onValueChange(newConfig)
  }

  function addBetGroup() {
    const newConfig = {
      ...config,
      betGroups: [...config.betGroups, makeDefaultBetGroup(game.modes[0]?.name || "")],
    }
    onValueChange(newConfig)
  }

  function changeGroupMode(id: string, mode: string) {
    const newConfig = {
      ...config,
      betGroups: config.betGroups.map((bg) => (bg.id === id ? { ...bg, mode } : bg)),
    }
    onValueChange(newConfig)
  }

  function updateGroupSpins(id: string, spins: number | null) {
    const newConfig = {
      ...config,
      betGroups: config.betGroups.map((bg) =>
        bg.id === id ? { ...bg, spins: spins ?? bg.spins } : bg,
      ),
    }
    onValueChange(newConfig)
  }

  function updateGroupBetAmnt(id: string, betAmount: number | null) {
    const newConfig = {
      ...config,
      betGroups: config.betGroups.map((bg) =>
        bg.id === id ? { ...bg, betAmount: betAmount ?? bg.betAmount } : bg,
      ),
    }
    onValueChange(newConfig)
  }

  function removeBetGroup(id: string) {
    const newConfig = {
      ...config,
      betGroups: config.betGroups.filter((bg) => bg.id !== id),
    }
    onValueChange(newConfig)
  }

  const betGroupModes = game.modes.map((m) => ({
    label: `${m.name} (Cost: ${m.cost}x)`,
    value: m.name,
  }))

  function getModeRtp(modeName: string) {
    const mode = game.modes.find((m) => m.name === modeName)
    return mode ? mode.rtp * 100 : 0
  }

  function getModeCost(modeName: string) {
    const mode = game.modes.find((m) => m.name === modeName)
    return mode ? mode.cost : 1
  }

  const simulationMutation = useMutation({
    mutationKey: ["game", "simulation", gameId],
    mutationFn: async () => {
      return await mutation.startBetSimulation(gameId, config)
    },
  })

  const frmt = new Intl.NumberFormat("en-DE")

  const canNotSimulate =
    config.betGroups.length === 0 || isSaving || simulationMutation.isPending

  const isBusy = isSaving || simulationMutation.isPending

  return (
    <div className="mb-4 rounded-lg overflow-clip bg-ui-900 border border-ui-700">
      <Tabs>
        <TabsList>
          <TabsTrigger value="config" className="rounded-none">
            <IconSettings />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="results" className="rounded-none">
            <IconReportAnalytics />
            Results
          </TabsTrigger>
          <Button
            variant="ghost-destructive"
            className="rounded-none ml-auto"
            onClick={() => removeSimulation(config.id)}
          >
            <IconTrash />
            Remove Simulation
          </Button>
        </TabsList>
        <TabsContent value="config" className="p-6">
          <h5 className="flex items-center gap-2">
            <IconUsers />
            Virtual Players
          </h5>
          <div className="flex gap-4 mt-2 mb-4">
            <NumberInput
              label="Player Count"
              step={1}
              inputMode="numeric"
              className="w-full"
              value={config.players.count}
              onValueChange={(v) => updatePlayerCount(v)}
            />
            <NumberInput
              label="Starting Balance"
              step={50}
              inputMode="numeric"
              className="w-full"
              value={config.players.startingBalance}
              onValueChange={(v) => updateStartingBalance(v)}
            />
          </div>
          <h5 className="flex items-center gap-2">
            <IconBusinessplan />
            Bet Groups
          </h5>
          <div className="mt-2 mb-4 text-ui-100">
            Bet groups are played sequentially, either sharing a players balance, or
            starting fresh.
          </div>
          <div className="grid grid-cols-3 gap-4">
            {config.betGroups.map((bg, index) => (
              <div key={index} className="p-4 rounded-lg bg-ui-950 flex flex-col gap-2">
                <Select
                  label="Mode"
                  value={bg.mode}
                  multiple={false}
                  onValueChange={(v) => changeGroupMode(bg.id, v || "")}
                  items={betGroupModes}
                >
                  <SelectTrigger className="w-full" />
                  <SelectContent>
                    {betGroupModes.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <NumberInput
                  label="Number of Bets"
                  step={10}
                  inputMode="numeric"
                  className="w-full"
                  value={bg.spins}
                  onValueChange={(v) => updateGroupSpins(bg.id, v)}
                />
                <NumberInput
                  label="Bet"
                  step={0.1}
                  inputMode="decimal"
                  className="w-full"
                  value={bg.betAmount}
                  onValueChange={(v) => updateGroupBetAmnt(bg.id, v)}
                />
                <div className="mt-2 flex gap-4 justify-between items-end">
                  <div className="text-sm">
                    <div>Estimated Costs:</div>
                    <div className="flex gap-2">
                      <span className="font-bold">0% RTP:</span>
                      <span>
                        {frmt.format(bg.betAmount * bg.spins * getModeCost(bg.mode))}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold">50% RTP:</span>
                      <span>
                        {frmt.format(
                          (bg.betAmount * bg.spins * getModeCost(bg.mode)) / 2,
                        )}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-bold">{getModeRtp(bg.mode)}% RTP:</span>
                      <span>
                        {frmt.format(
                          (bg.betAmount *
                            bg.spins *
                            getModeCost(bg.mode) *
                            (100 - getModeRtp(bg.mode))) /
                            100,
                        )}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost-destructive"
                    isIconButton
                    onClick={() => removeBetGroup(bg.id)}
                  >
                    <IconTrash />
                  </Button>
                </div>
              </div>
            ))}
            <div
              onClick={addBetGroup}
              className="p-6 rounded-lg border border-dashed border-ui-700 flex flex-col items-center justify-center gap-2 bg-ui-950 hover:bg-ui-900 cursor-pointer"
            >
              <IconPlus />
              Add Bet Group
            </div>
          </div>
          <div className="mt-6">
            {simulationMutation.isPending ? (
              <div className="h-10 bg-ui-800 rounded-lg flex items-center justify-center">
                <SimulationLoading isLoading={true} />
              </div>
            ) : (
              <Button
                disabled={canNotSimulate}
                onClick={() => simulationMutation.mutate()}
              >
                {isBusy ? <IconLoader2 className="animate-spin" /> : <IconPlayerPlay />}
                Start Simulation
              </Button>
            )}
          </div>
        </TabsContent>
        <TabsContent value="results" className="p-6"></TabsContent>
      </Tabs>
    </div>
  )
}
