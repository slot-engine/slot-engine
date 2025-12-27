export interface ServerToClientEvents {
  simulationProgress: SimulationProgress
}

export interface ClientToServerEvents {
  simulationProgress: SimulationProgress
  simulationShouldStop: (gameId: string, response: (stop: boolean) => void) => void
}

type SimulationProgress = (data: {
  mode: string
  percentage: number
  current: number
  total: number
}) => void
