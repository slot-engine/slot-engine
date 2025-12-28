import { SimulationSummary } from "@slot-engine/core/types"

export interface ServerToClientEvents {
  simulationProgress: SimulationProgress
  simulationSummary: (data: { summary: SimulationSummary }) => void
}

export interface ClientToServerEvents {
  simulationProgress: SimulationProgress
  simulationSummary: (data: { summary: SimulationSummary }) => void
  simulationShouldStop: (gameId: string, response: (stop: boolean) => void) => void
}

type SimulationProgress = (data: {
  mode: string
  percentage: number
  current: number
  total: number
}) => void
