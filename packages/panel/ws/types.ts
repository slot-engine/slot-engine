import { type SimulationSummary } from "@slot-engine/core/types"

export interface ServerToClientEvents {
  simulationProgress: SimulationProgress
  simulationSummary: (data: { summary: SimulationSummary }) => void
  simulationStatus: (message: string) => void
}

export interface ClientToServerEvents {
  simulationProgress: SimulationProgress
  simulationSummary: (data: { summary: SimulationSummary }) => void
  simulationShouldStop: (gameId: string, response: (stop: boolean) => void) => void
  simulationStatus: (message: string) => void
}

type SimulationProgress = (data: {
  mode: string
  percentage: number
  current: number
  total: number
  timeRemaining: number
}) => void
