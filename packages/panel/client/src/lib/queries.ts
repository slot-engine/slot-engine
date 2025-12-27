import {
  type APIGamesResponse,
  type APIStatusResponse,
  type APIGameResponse,
  type APIGameInfoResponse,
  type APIGameGetSimConfResponse,
  type PanelGameConfig,
} from "../../../server/types"
import type { SimulationOptions } from "./types"

export class FetchError extends Error {
  code: number

  constructor(code: number, message: string) {
    super(message)
    this.code = code
  }
}

export async function api<TData>(endpoint: string, opts?: RequestInit) {
  const res = await fetch(`/api/${endpoint}`, opts)

  if (!res.ok) {
    throw new FetchError(res.status, res.statusText)
  }

  return res.json() as Promise<TData>
}

export const query = {
  status: () => api<APIStatusResponse>("status"),
  games: () => api<APIGamesResponse>("games"),
  game: (id: string) => api<APIGameResponse>(`games/${id}`),
  gameInfo: (id: string) => api<APIGameInfoResponse>(`games/${id}/info`),
  gameSimConf: (id: string) => api<APIGameGetSimConfResponse>(`games/${id}/sim-conf`),
}

export const mutation = {
  gameSimConf: (id: string, data: PanelGameConfig["simulation"]) =>
    api<APIGameGetSimConfResponse>(`games/${id}/sim-conf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }),
  startSimulation: (gameId: string, opts: SimulationOptions) =>
    api<void>(`games/${gameId}/sim-run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(opts),
    }),
}

export type APIResponse<T> = T extends keyof typeof query
  ? Awaited<ReturnType<(typeof query)[T]>>
  : never
