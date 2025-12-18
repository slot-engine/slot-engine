import {
  type APIGamesResponse,
  type APIStatusResponse,
  type APIGameDetailResponse,
} from "../../../server/types"

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
  game: (id: string) => api<APIGameDetailResponse>(`games/${id}`),
}

export type APIResponse<T> = T extends keyof typeof query
  ? Awaited<ReturnType<(typeof query)[T]>>
  : never
