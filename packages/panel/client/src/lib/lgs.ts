import type {
  CreateReplayInput,
  CreateSessionInput,
  ForcedOutcome,
  LgsCreateReplayResponse,
  LgsCreateSessionResponse,
  LgsErrorResponse,
  LgsForceResponse,
  LgsInfoResponse,
  LgsSessionResponse,
} from "@slot-engine/lgs"
import { FetchError } from "./queries"

async function request<T>(path: string, init?: RequestInit) {
  const res = await fetch(path, init)
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = (body as LgsErrorResponse | null)?.message ?? res.statusText
    throw new FetchError(res.status, message)
  }
  return body as T
}

function json(method: "POST" | "PUT", body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }
}

export const lgsInfo = () => request<LgsInfoResponse>("/lgs")

export const createSession = (input: CreateSessionInput) =>
  request<LgsCreateSessionResponse>("/lgs/sessions", json("POST", input))

export const createReplay = (input: CreateReplayInput) =>
  request<LgsCreateReplayResponse>("/lgs/replays", json("POST", input))

export const getSession = (id: string) =>
  request<LgsSessionResponse>(`/lgs/sessions/${encodeURIComponent(id)}`)

export const setForce = (id: string, force: ForcedOutcome | null) =>
  request<LgsForceResponse>(
    `/lgs/sessions/${encodeURIComponent(id)}/force`,
    json("PUT", { force }),
  )
