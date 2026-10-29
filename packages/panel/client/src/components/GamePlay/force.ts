import type { ForcedOutcome } from "@slot-engine/lgs"

export interface ForceFields {
  bookId: number | null
  payoutMultiplier: number | null
}

export const NO_FORCE: ForceFields = { bookId: null, payoutMultiplier: null }

export function toForce({ bookId, payoutMultiplier }: ForceFields): ForcedOutcome | null {
  if (bookId !== null) return { bookId }
  if (payoutMultiplier !== null) return { payoutMultiplier }
  return null
}

export function describeForce(force: ForcedOutcome | null) {
  if (!force) return "Not forcing"
  if ("bookId" in force) return `Forcing book ${force.bookId}`
  return `Forcing the payout closest to ${force.payoutMultiplier}x`
}
