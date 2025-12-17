import { type APIGamesResponse, type APIStatusResponse } from "../../../server/types"

export async function api<TData>(endpoint: string, opts?: RequestInit) {
  const res = await fetch(`/api/${endpoint}`, opts)
  return res.json() as Promise<TData>
}

export const query = {
  status: () => api<APIStatusResponse>("status"),
  games: () => api<APIGamesResponse>("games"),
}

export type APIResponse<T> = T extends keyof typeof query
  ? Awaited<ReturnType<(typeof query)[T]>>
  : never
