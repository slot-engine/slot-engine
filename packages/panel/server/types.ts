// Keep types in this file, because they are imported in the client

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
  forceStop: boolean
}

export type APIGameGetSimConfResponse = PanelGameConfig["simulation"]

export type APIGamePostSimConfResponse = PanelGameConfig["simulation"]
