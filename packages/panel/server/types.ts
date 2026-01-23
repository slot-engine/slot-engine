// Keep types in this file, because they are imported in the client

import type {
  LookupTable,
  LookupTableSegmented,
  PayoutStatistics,
  SimulationSummary,
  Statistics,
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
    makeUncompressedBooks?: boolean
  }
  betSimulations: BetSimulationConfig[]
  reelSets: Array<{
    name: string
    path: string
    symbolColors: Record<string, string>
  }>
  forceStop: boolean
}

export interface BetSimulationConfig {
  id: string
  players: {
    count: number
    startingBalance: number
  }
  betGroups: BetSimulationBetGroup[]
}

export interface BetSimulationBetGroup {
  id: string
  mode: string
  betAmount: number
  spins: number
}

export interface BetSimulationResult {
  id: string
  bets: BetSimulationStats
  groups: BetSimulationResultGroup[]
}

export interface BetSimulationResultGroup {
  id: string
  bets: BetSimulationStats
}

export interface BetSimulationStats {
  totalBets: number
  avgBets: number
  low20PercentileBets: number
  high20PercentileBets: number
  medianBets: number
  totalWager: number
  numBetsProfit: number
  numBetsLoss: number
  totalProfit: number
  avgProfit: number
  minProfit: number
  maxProfit: number
  payoutStdDev: number
  low20PercentileProfit: number
  high20PercentileProfit: number
  medianProfit: number
  longestWinStreak: number
  longestLoseStreak: number
  longest0Streak: number
  highestBalance: number
  lowestBalance: number
  avgRtp: number
  medianRtp: number
  low20PercentileRtp: number
  high20PercentileRtp: number
  highestRtp: number
  lowestRtp: number
  hits15: number
  hits40: number
  hits90: number
  visualization: {
    criteriaPerGroup: Record<string, Record<string, number>>
  }
  warnings: string[]
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

export type APIGamePostBetSimRunResponse = {
  results: BetSimulationStats
}

export type APIGameStatsPayoutsResponse = {
  statistics: PayoutStatistics[]
}

export type APIGameStatsSummaryResponse = {
  statistics: Statistics[]
}

export type APIGameReelSetsResponse = {
  reelSets: Array<{
    path: string
    name: string
  }>
}

export type APIGameGetReelSetResponse = {
  reelSet: {
    path: string
    name: string
    reels: Array<Array<{ id: string; symbol: string }>>
    colors: Record<string, string>
  }
  options: {
    symbols: string[]
  }
}
