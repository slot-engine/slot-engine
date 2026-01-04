// Keep types in this file, because they are imported in the client

import type {
  LookupTable,
  LookupTableSegmented,
  SimulationSummary,
  WrittenBook,
} from "@slot-engine/core/types"

export interface APIMessageResponse {
  message: string
}

export interface APIGamesResponse {
  games: Array<{
    id: string
    name: string
    modes: number
    isValid: boolean
    path: string
  }>
}

export interface APIGameResponse {
  id: string
  name: string
  path: string
}

export interface APIGameInfoResponse {
  id: string
  name: string
  path: string
  maxWin: number
  isValid: boolean
  modes: Array<{
    name: string
    cost: number
    rtp: number
  }>
}

export interface APIStatusResponse {
  ok: boolean
}

export interface PanelGameConfig {
  id: string
  simulation: {
    concurrency: number
    simRunsAmount: Record<string, number>
    maxPendingSims: number
    maxDiskBuffer: number
  }
  betSimulations: BetSimulationConfig[]
  forceStop: boolean
}

export interface BetSimulationConfig {
  id: string
  players: {
    count: number
    startingBalance: number
  }
  balanceMode: "shared" | "fresh"
  betGroups: BetSimulationBetGroup[]
}

export interface BetSimulationBetGroup {
  id: string
  mode: string
  betAmount: number
  spins: number
}

export type APIGameGetSimConfResponse = PanelGameConfig["simulation"]

export type APIGamePostSimConfResponse = PanelGameConfig["simulation"]

export type APIGameSimSummaryResponse = {
  summary: SimulationSummary
}

export type APIGameExploreResponse = {
  lut: LookupTable
  lutSegmented: LookupTableSegmented
  nextCursor: number | null
}

export type APIGameExploreBookResponse = {
  book: WrittenBook
}

export type APIGameForceKeysResponse = {
  forceKeys: Record<string, string[]>
}

export type APIGameGetBetSimConfResponse = {
  configs: BetSimulationConfig[]
}

export type APIGamePostBetSimConfResponse = {
  configs: BetSimulationConfig[]
}
