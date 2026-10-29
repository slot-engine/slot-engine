import type { LgsInfoResponse } from "@slot-engine/lgs"
import { AMOUNT_SCALE } from "./settings"

export interface ReplayFields {
  mode: string
  bookId: number | null
  /** Bet amount in major units. */
  amount: number | null
}

export interface ReplayRequest {
  mode: string
  event: number
  amount: number | null
}

export function initialReplayFields(
  modes: Array<{ name: string }>,
  info: LgsInfoResponse,
): ReplayFields {
  return {
    mode: modes[0]?.name ?? "",
    bookId: null,
    amount: info.bets.default / AMOUNT_SCALE,
  }
}

export function toReplayRequest({
  mode,
  bookId,
  amount,
}: ReplayFields): ReplayRequest | null {
  if (bookId === null) return null
  return { mode, event: bookId, amount }
}
