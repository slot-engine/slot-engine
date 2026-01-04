import {
  IconBusinessplan,
  IconInfoCircle,
  IconPlus,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"
import { useGameContext } from "../../context/GameContext"
import { useEffect, useRef, useState } from "react"
import { Button } from "../Button"
import { NumberInput } from "../NumberInput"
import type { BetSimulationConfig } from "../../lib/types"
import { mutation, query } from "../../lib/queries"
import { useMutation, useQuery } from "@tanstack/react-query"
import { ErrorDisplay } from "../Error"
import { Skeleton } from "../Skeleton"

const DEFAULT_CONFIG: BetSimulationConfig = {
  id: "",
  players: {
    count: 100,
    startingBalance: 1000,
  },
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

  return (
    <div className="grid grid-cols-[2fr_1fr] gap-4 items-start">
      <div>
        {betConfigs.length > 0 ? (
          betConfigs.map((config, index) => (
            <BetSimulation config={config} onValueChange={onConfigChange} key={index} />
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
}

const BetSimulation = ({ config, onValueChange }: BetSimulationProps) => {
  const { game } = useGameContext()

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

  return (
    <div className="mb-4 p-6 rounded-lg bg-ui-900 border border-ui-700">
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
        Bet groups are played sequentially, either sharing a players balance, or with a
        fresh balance.
      </div>
      <div className="grid grid-cols-4 gap-4">
        {config.betGroups.map((bg, index) => (
          <div key={index} className="p-4 rounded-lg bg-ui-950 flex flex-col gap-2"></div>
        ))}
        <div
          onClick={addBetGroup}
          className="p-6 rounded-lg border border-dashed border-ui-700 flex flex-col items-center justify-center gap-2 bg-ui-950 hover:bg-ui-900 cursor-pointer"
        >
          <IconPlus />
          Add Bet Group
        </div>
      </div>
    </div>
  )
}
