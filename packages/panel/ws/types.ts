export interface ServerToClientEvents {
  simulationProgress: SimulationProgress
}

export interface ClientToServerEvents {
  simulationProgress: SimulationProgress
}

type SimulationProgress = (data: {
  mode: string
  percentage: number
  current: number
  total: number
}) => void
