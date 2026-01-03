export interface LinkItem {
  label: string
  href: string
  description?: string
  icon?: React.ReactNode
  target?: string
}

export interface PropsWithGameId {
  gameId: string
}

export type SimulationOptions = {
  simRunsAmount: Record<string, number>
  concurrency: number
  maxPendingSims: number
  maxDiskBuffer: number
}

export type SetState<T> = React.Dispatch<React.SetStateAction<T>>

export interface BetSimulationConfig {
  id: string
  players: {
    count: number
    startingBalance: number
  }
  betGroups: BetSimulationBetGroup[]
}

export interface BetSimulationBetGroup {
  mode: string
  betAmount: number
  spins: number
}
