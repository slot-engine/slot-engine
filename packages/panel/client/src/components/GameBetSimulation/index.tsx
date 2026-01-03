import {
  IconBusinessplan,
  IconInfoCircle,
  IconPlus,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"
import { useGameContext } from "../../context/GameContext"
import { useState } from "react"
import { Button } from "../Button"
import { NumberInput } from "../NumberInput"
import type { BetSimulationConfig } from "../../lib/types"

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

export const GameBetSimulation = () => {
  const { gameId } = useGameContext()

  const [betConfigs, setBetConfigs] = useState<BetSimulationConfig[]>([])

  function addBetSimConfig() {
    setBetConfigs((prev) => [...prev, makeDefaultConfig()])
  }

  function onConfigChange(config: BetSimulationConfig) {
    setBetConfigs((prev) => prev.map((c) => (c.id === config.id ? config : c)))
  }

  return (
    <div className="grid grid-cols-[2fr_1fr] gap-8">
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
      <div className="p-6 rounded-lg bg-ui-900 border border-ui-700">
        <div className="flex items-center gap-2 mb-2">
          <IconInfoCircle />
          <h4>How does this work?</h4>
        </div>
        <p>
          This module simulates game behavior with multiple players betting on the game
          under equal circumstances. For each "spin" a virtual player does, a random
          weighted result from the lookup table is chosen, similar to real Stake LGS
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
  function updatePlayerCount(count: number | null) {
    const newConfig = {
      ...config,
      players: { ...config.players, count: count ?? config.players.count },
    }

    onValueChange(newConfig)
  }

  return (
    <div className="mb-4 p-6 rounded-lg bg-ui-900 border border-ui-700">
      <h5 className="flex items-center gap-2">
        <IconUsers />
        Virtual Players
      </h5>
      <div className="flex gap-4 mt-2 mb-4 pb-4 border-b border-ui-700">
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
          value={config.players.count}
          onValueChange={(v) => updatePlayerCount(v)}
        />
      </div>
      <h5 className="flex items-center gap-2">
        <IconBusinessplan />
        Bet Groups
      </h5>
    </div>
  )
}
